import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useAuthDependencies } from '../../../di/hooks/use-auth-dependencies'

export function useForgotPasswordViewModel() {
  const { requestPasswordResetUseCase } = useAuthDependencies()
  const [email, setEmail] = useState('')

  const requestReset = useMutation({
    mutationFn: () => requestPasswordResetUseCase.execute({ email }),
  })

  return {
    email,
    setEmail,
    requestReset: () => requestReset.mutate(),
    isRequesting: requestReset.isPending,
    requestSent: requestReset.isSuccess,
  }
}
