import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { InvitationLink } from '@domain/repositories/user-repository'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { buildInvitationMessage, INVITE_LINK_VALIDITY_HOURS } from './invitation-message'

// specs/web-users-invitation-links.md §4 — one dialog, two modes: a brand
// new invite from the "+ Inviter un utilisateur" button (form fields,
// AC-WU-30), or a fresh link for an already-'invited' row's "Lien
// d'invitation" action (no form — the account already exists). Never a
// second dialog component for the second mode.
export type InviteUserDialogTarget = { mode: 'create' } | { mode: 'reissue'; userId: string; fullName: string }

interface UseInviteUserDialogViewModelParams {
  target: InviteUserDialogTarget
  onClose: () => void
}

function firstNameOf(fullName: string): string {
  return fullName.trim().split(/\s+/)[0] ?? fullName
}

// specs/web-users-invitation-links.md §4 "Shared rules" — useMutation,
// never useQuery: a query result sits in the TanStack Query cache (and in
// IndexedDB once offline persistence is added), a single-use credential
// must never be persisted there. The link/message live in THIS hook's own
// state only, gone the moment the dialog closes (no persistence anywhere,
// §1.6).
export function useInviteUserDialogViewModel({ target, onClose }: UseInviteUserDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { inviteUserUseCase, reissueInvitationLinkUseCase } = useUsersDependencies()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')
  const [link, setLink] = useState<InvitationLink | null>(null)
  const [copyState, setCopyState] = useState<'idle' | 'copied'>('idle')
  const [clipboardError, setClipboardError] = useState<UiError | null>(null)

  const generate = useMutation({
    mutationFn: (): Promise<InvitationLink> => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      if (target.mode === 'create') {
        return inviteUserUseCase.execute({ actorId: user.id, fullName, email })
      }
      return reissueInvitationLinkUseCase.execute({ actorId: user.id, targetUserId: target.userId })
    },
    onSuccess: (result) => {
      setLink(result)
      // AC-WU-21/AC-WU-33 — a freshly-created account appears in the list,
      // at status "Invité", without a manual reload. A re-issue changes no
      // row (§2 — reissueInvitationLink() creates nothing), so this
      // invalidation is a harmless no-op for that mode rather than a
      // second, mode-specific code path.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
    },
  })

  const displayFullName = target.mode === 'create' ? fullName : target.fullName
  const message = link ? buildInvitationMessage({ firstName: firstNameOf(displayFullName), url: link.url, validityHours: INVITE_LINK_VALIDITY_HOURS }) : null

  async function copyMessage() {
    if (!message) return
    try {
      await navigator.clipboard.writeText(message)
      setCopyState('copied')
      setClipboardError(null)
    } catch {
      // §4 "Shared rules" — on rejection (non-HTTPS context, permission…)
      // the message stays visible/selectable, an inline error appears, no
      // raw exception surfaces.
      setClipboardError({
        message: "Impossible de copier automatiquement. Sélectionnez et copiez le message manuellement.",
        variant: 'inline',
        retryable: true,
      })
    }
  }

  async function shareMessage() {
    if (!message || !navigator.share) return
    try {
      await navigator.share({ text: message })
    } catch {
      // AbortError (user cancelled the share sheet) is the overwhelmingly
      // common rejection here — never surfaced as an error.
    }
  }

  function close() {
    setFullName('')
    setEmail('')
    setLink(null)
    setCopyState('idle')
    setClipboardError(null)
    generate.reset()
    onClose()
  }

  const canSubmit = target.mode === 'create' ? !!fullName.trim() && !!email.trim() && !generate.isPending : !generate.isPending

  return {
    mode: target.mode,
    // Only meaningful in 'create' mode — the reissue step has no form.
    fullName,
    setFullName,
    email,
    setEmail,

    canSubmit,
    isGenerating: generate.isPending,
    generateErrorMessage: generate.error ? mapDomainErrorToUiError(generate.error).message : null,
    generate: () => generate.mutate(),

    link,
    message,
    copyState,
    clipboardError,
    copyMessage,
    canShare: typeof navigator !== 'undefined' && typeof navigator.share === 'function',
    shareMessage,

    validityHours: INVITE_LINK_VALIDITY_HOURS,
    close,
  }
}
