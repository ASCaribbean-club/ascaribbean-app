import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Handedness } from '@domain/entities/user'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { handednessOrNull, parseAgeInput } from './user-profile-form'

interface UseUserEditDialogViewModelParams {
  target: AdminUserDirectoryEntry
  onSuccess: () => void
}

// specs/web-users.md §2.7/PO-WU-02 résolu — "Modifier l'utilisateur". Writes
// full_name, age and handedness through UpdateUserUseCase — `email` is read here
// for DISPLAY only (the dialog's own read-only field, §2.7), this hook has
// no setEmail/submitted email at all: the same "the shape documents the
// guarantee" reasoning already used for AssignCoachToTeamsUseCase.
export function useUserEditDialogViewModel({ target, onSuccess }: UseUserEditDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { updateUserUseCase } = useUsersDependencies()

  const [fullName, setFullName] = useState(target.fullName)
  const [age, setAge] = useState(target.age === null ? '' : String(target.age))
  const [handedness, setHandedness] = useState<Handedness | ''>(target.handedness ?? '')

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session.
        throw new Error('No authenticated admin session.')
      }
      return updateUserUseCase.execute({ actorId: user.id, userId: target.id,
        fullName,
        age: parseAgeInput(age),
        handedness: handednessOrNull(handedness),
      })
    },
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersAdminDirectory() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.usersBadgeCount() })
      onSuccess()
    },
  })

  const canSubmit = !!fullName.trim() && !mutation.isPending

  // AC-WU-22 — on failure the dialog stays open, saisie conservée, French
  // message translated from the DomainError.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    fullName,
    setFullName,
    age,
    setAge,
    handedness,
    setHandedness,
    email: target.email,

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
