import { useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'

// AC-WE-05: reuses the SAME SignInWithPasswordUseCase as the mobile
// useLoginViewModel (presentation/features/auth/login/useLoginViewModel.ts),
// through the same DI container — no new use case, no Supabase call from
// presentation/. Deliberately narrower than its mobile counterpart:
// no magic-link branch (AC-WE-04, "no option de connexion à usage unique"),
// no forgot-password wiring (AC-WE-03/PO-WE-07) — don't reintroduce either
// by copying the mobile hook wholesale.
export function useBackofficeLoginViewModel() {
  const { signInWithPasswordUseCase } = useAuthDependencies()
  const navigate = useNavigate()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')

  const signIn = useMutation({
    mutationFn: () => signInWithPasswordUseCase.execute({ email, password }),
    onSuccess: () => navigate('/admin', { replace: true }),
  })

  // TODO (AC-WE-06/AC-WE-07, specs/web-empty-state.md §4): surface
  // signIn.error through mapDomainErrorToUiError
  // (presentation/shared/errors/map-domain-error-to-ui-error.ts) rather than
  // a raw error.message. This matters specifically because of AC-WE-07: the
  // message must NOT distinguish "compte inconnu" from "mot de passe
  // incorrect" from "rôle manquant" — the mobile useLoginViewModel's own
  // getErrorMessage() (exposing DomainError.message directly) doesn't give
  // you that guarantee for free, which is why this can't just copy it.
  const errorMessage: string | null = null

  return {
    email,
    setEmail,
    password,
    setPassword,
    submit: () => signIn.mutate(),
    isSubmitting: signIn.isPending,
    errorMessage,
  }
}
