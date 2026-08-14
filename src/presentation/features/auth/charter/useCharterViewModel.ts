import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/hooks/use-auth'
import { useAuthDependencies } from '../../../di/hooks/use-auth-dependencies'

export function useCharterViewModel() {
  const { acceptCharterUseCase } = useAuthDependencies()
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  const [hasRead, setHasRead] = useState(false)

  const acceptCharter = useMutation({
    // Non-null: router.tsx only reaches CharterPage through RequireSession,
    // which already redirects to /login when there's no user.
    mutationFn: () => acceptCharterUseCase.execute({ userId: user!.id }),
    onSuccess: async () => {
      await refreshUser()
      navigate('/', { replace: true })
    },
  })

  return {
    hasRead,
    setHasRead,
    accept: () => acceptCharter.mutate(),
    canAccept: hasRead && !acceptCharter.isPending,
    isAccepting: acceptCharter.isPending,
  }
}
