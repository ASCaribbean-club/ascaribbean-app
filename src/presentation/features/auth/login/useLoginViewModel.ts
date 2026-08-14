import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { DomainError } from '@domain/errors/domain-error'
import { useAuthDependencies } from '../../../di/hooks/use-auth-dependencies'

export function useLoginViewModel() {
  const { signInWithPasswordUseCase, requestMagicLinkUseCase } = useAuthDependencies()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [isPasswordMode, setIsPasswordMode] = useState(true)

  const passwordSignIn = useMutation({
    mutationFn: () => signInWithPasswordUseCase.execute({ email, password }),
    onSuccess: () => navigate('/', { replace: true }),
  })

  const magicLink = useMutation({
    mutationFn: () => requestMagicLinkUseCase.execute({ email }),
  })

  return {
    email,
    setEmail,
    password,
    setPassword,
    isPasswordMode,
    toggleMode: () => setIsPasswordMode((mode) => !mode),
    primaryLabel: isPasswordMode ? 'Se connecter' : 'Envoyer le lien de connexion',
    submit: () => (isPasswordMode ? passwordSignIn.mutate() : magicLink.mutate()),
    isSubmitting: isPasswordMode ? passwordSignIn.isPending : magicLink.isPending,
    signInError: passwordSignIn.error instanceof DomainError ? passwordSignIn.error.message : null,
    magicLinkSent: magicLink.isSuccess,
  }
}
