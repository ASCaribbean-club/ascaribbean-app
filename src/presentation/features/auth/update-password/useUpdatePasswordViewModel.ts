import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { DomainError } from '@domain/errors/domain-error'
import { useAuthDependencies } from '../../../di/hooks/use-auth-dependencies'

export type UpdatePasswordStatus = 'invalid' | 'ready' | 'verifying' | 'form'

// specs/web-users-invitation-links.md §5 — mirrors ActivationPage's own
// parseType: 'recovery' is the only type the admin-generated password-reset
// link (UserRepository.generatePasswordResetLink, invite-user Edge
// Function's own 'reset-password' mode) ever carries — an 'invite'/
// 'magiclink' link opened here still lands on 'invalid' rather than being
// accepted.
function parseType(value: string | null): 'recovery' | null {
  return value === 'recovery' ? value : null
}

// specs/web-users-invitation-links.md §5 — public /update-password route
// (router.tsx, outside RequireSession — there is no session until
// verifyAuthLink succeeds). Deliberately does NOT verify on load, same
// reasoning as ActivationPage: the token is single-use, and a link-preview
// crawler's GET (WhatsApp/SMS/email client building a preview before the
// member ever taps the link — this link is shared the same manual way as an
// invitation, see InviteUserDialog) must never be the thing that consumes
// it — only the member's own tap on "Réinitialiser mon mot de passe" does.
export function useUpdatePasswordViewModel() {
  const [searchParams] = useSearchParams()
  const navigate = useNavigate()
  const { verifyAuthLinkUseCase, updatePasswordUseCase } = useAuthDependencies()

  const tokenHash = searchParams.get('token_hash')
  const type = useMemo(() => parseType(searchParams.get('type')), [searchParams])

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

  // A missing/malformed URL and a rejected verifyOtp() land on the SAME
  // "invalid/expired" state, never a distinct third state the member would
  // have to tell apart from the other — same reasoning as ActivationPage's
  // own status derivation.
  const status: UpdatePasswordStatus =
    !tokenHash || !type || verify.isError
      ? 'invalid'
      : verify.isSuccess
        ? 'form'
        : verify.isPending
          ? 'verifying'
          : 'ready'

  return {
    status,

    verify: () => verify.mutate(),

    newPassword,
    setNewPassword,
    confirmPassword,
    setConfirmPassword,
    passwordsMatch,
    submit: () => updatePassword.mutate(),
    isSubmitting: updatePassword.isPending,
    error: updatePassword.error instanceof DomainError ? updatePassword.error.message : null,
  }
}
