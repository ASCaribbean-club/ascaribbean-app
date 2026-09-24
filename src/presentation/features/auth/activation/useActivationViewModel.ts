import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { AuthLinkType } from '@domain/repositories/auth-repository'
import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'

export type ActivationStatus = 'invalid' | 'ready' | 'verifying' | 'form'

// Activation only ever hands out 'invite'/'magiclink' links (invite-user
// Edge Function) — 'recovery' is UpdatePasswordPage's own link type, not a
// valid /activation one, so a stray recovery link opened here still lands
// on 'invalid' rather than being silently accepted.
function parseType(value: string | null): AuthLinkType | null {
  return value === 'invite' || value === 'magiclink' ? value : null
}

// specs/web-users-invitation-links.md §5 — public /activation route
// (router.tsx, outside RequireSession — there is no session until
// verifyAuthLink succeeds). Deliberately does NOT verify on load
// (point 1): the token is single-use, and a link-preview crawler's GET
// (WhatsApp/SMS building a preview before the member ever taps the link)
// must never be the thing that consumes it — only the member's own tap on
// "Activer mon compte" does.
export function useActivationViewModel() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyAuthLinkUseCase, updatePasswordUseCase } = useAuthDependencies()
  const { user } = useAuth()

  const tokenHash = searchParams.get('token_hash')
  const type = useMemo(() => parseType(searchParams.get('type')), [searchParams])
  // §5 (amendement) — display-only, read straight from the URL (never
  // verified, never used by verifyAuthLinkUseCase itself): lets the
  // member confirm the link is really theirs BEFORE tapping "Activer mon
  // compte", same reasoning as buildActivationUrl's own comment in the
  // invite-user Edge Function. Absent on an older link generated before
  // this was added — the page falls back to generic copy in that case.
  const invitedName = searchParams.get('name')

  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  const verify = useMutation({
    mutationFn: () => {
      if (!tokenHash || !type) throw new Error('Missing token_hash/type — unreachable, the button is not rendered without them.')
      return verifyAuthLinkUseCase.execute({ tokenHash, type })
    },
  })

  const updatePassword = useMutation({
    mutationFn: () => updatePasswordUseCase.execute({ newPassword }),
    onSuccess: () => navigate('/', { replace: true }),
  })

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  // specs/web-users-invitation-links.md §5 point 5 — a missing/malformed
  // URL and a rejected verifyOtp() land on the SAME "invalid/expired,
  // contact an administrator" state, never a distinct third state the
  // member would have to tell apart from the other.
  //
  // Gated on verify.isSuccess, NOT on `user` truthiness: `user` reflects
  // WHATEVER session already lives in this browser's storage, which can
  // be a stale, unrelated one (an admin testing their own link while still
  // logged into the backoffice, a shared device…). Branching on `user`
  // alone skipped straight to 'form' using THAT session's identity without
  // ever calling verifyOtp() for the token in the URL — the invited
  // member's own tap on "Activer mon compte" never fired. verify.isSuccess
  // is this page's own, page-local signal that THIS token was actually
  // exchanged.
  const status: ActivationStatus =
    !tokenHash || !type || verify.isError
      ? 'invalid'
      : verify.isSuccess
        ? 'form'
        : verify.isPending
          ? 'verifying'
          : 'ready'

  return {
    status,
    invitedName,
    fullName: user?.fullName ?? '',
    roles: user?.roles ?? [],

    verify: () => verify.mutate(),

    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordsMatch,
    submitPassword: () => updatePassword.mutate(),
    isSubmittingPassword: updatePassword.isPending,
    passwordError: updatePassword.error ? mapDomainErrorToUiError(updatePassword.error).message : null,
  }
}
