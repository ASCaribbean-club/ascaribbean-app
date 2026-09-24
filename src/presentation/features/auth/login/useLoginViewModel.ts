import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { DomainError } from '@domain/errors/domain-error'
import { useAuthDependencies } from '../../../di/hooks/use-auth-dependencies'

export function useLoginViewModel() {
  const { signInWithPasswordUseCase } = useAuthDependencies()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const passwordSignIn = useMutation({
    mutationFn: () => signInWithPasswordUseCase.execute({ email, password }),
    onSuccess: () => navigate('/', { replace: true }),
  })

  return {
    email,
    setEmail,
    password,
    setPassword,
    submit: () => passwordSignIn.mutate(),
    isSubmitting: passwordSignIn.isPending,
    signInError: passwordSignIn.error instanceof DomainError ? passwordSignIn.error.message : null,
  }
}
