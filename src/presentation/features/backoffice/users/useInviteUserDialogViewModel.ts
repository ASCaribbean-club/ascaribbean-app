import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

interface UseInviteUserDialogViewModelParams {
  onSuccess: () => void
}

// specs/web-users.md §2.5/PO-WU-01 résolu — "+ Inviter un utilisateur".
// Writes THROUGH InviteUserUseCase, never talking to Supabase/the Edge
// Function directly (AC-WU-30) — that call lives in data/'s
// UserRepositoryImpl.invite(), behind the use case.
export function useInviteUserDialogViewModel({ onSuccess }: UseInviteUserDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { inviteUserUseCase } = useUsersDependencies()

  const [fullName, setFullName] = useState('')
  const [email, setEmail] = useState('')

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return inviteUserUseCase.execute({ actorId: user.id, fullName, email })
    },
    onSuccess: () => {
      // AC-WU-21/AC-WU-33 — the invited account appears in the list, at
      // status "Invité", without a manual reload.
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
      onSuccess()
    },
  })

  const canSubmit = !!fullName.trim() && !!email.trim() && !mutation.isPending

  // AC-WU-34 — on failure the dialog stays open, saisies conservées, French
  // message translated from the DomainError (UserAlreadyRegisteredError,
  // UserDirectoryInsertFailedError, or the generic InviteUserFailedError
  // fallback).
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    fullName,
    setFullName,
    email,
    setEmail,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
