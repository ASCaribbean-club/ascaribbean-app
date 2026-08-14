import { useMemo, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { DomainError } from '@domain/errors/domain-error'
import { useAuth } from '../../../shared/hooks/use-auth'
import { useAuthDependencies } from '../../../di/hooks/use-auth-dependencies'

export type UpdatePasswordStatus = 'loading' | 'invalid-link' | 'unauthenticated' | 'form'

export function useUpdatePasswordViewModel() {
  const { updatePasswordUseCase, checkRecoveryLinkUseCase } = useAuthDependencies()
  const { user, isLoading } = useAuth()
  const navigate = useNavigate()
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')

  // Not affected by anything that changes during this page's lifetime — the
  // recovery-link outcome is fixed at the URL the user landed on.
  const hasRecoveryLinkError = useMemo(() => checkRecoveryLinkUseCase.execute(), [checkRecoveryLinkUseCase])

  const updatePassword = useMutation({
    mutationFn: () => updatePasswordUseCase.execute({ newPassword }),
    onSuccess: () => navigate('/', { replace: true }),
  })

  const passwordsMatch = newPassword.length > 0 && newPassword === confirmPassword

  const status: UpdatePasswordStatus = isLoading
    ? 'loading'
    : user
      ? 'form'
      : hasRecoveryLinkError
        ? 'invalid-link'
        : 'unauthenticated'

  return {
    status,
    // Invite-activation welcome header only makes sense before the charter
    // is accepted — a plain password reset from an already-onboarded member
    // reaches this same screen with charterAcceptedAt already set.
    showWelcome: Boolean(user && !user.charterAcceptedAt),
    fullName: user?.fullName ?? '',
    roles: user?.roles ?? [],
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
