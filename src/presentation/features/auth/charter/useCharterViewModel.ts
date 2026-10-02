import { useCallback, useState } from 'react'
import { useMutation } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../../shared/hooks/use-auth'
import { useAuthDependencies } from '../../../di/hooks/use-auth-dependencies'

export type ImageRightsChoice = 'authorize' | 'refuse'

export function useCharterViewModel() {
  const { acceptCharterUseCase } = useAuthDependencies()
  const { user, refreshUser } = useAuth()
  const navigate = useNavigate()
  // "Read" = scrolled to the bottom of the document; unlocks its control.
  const [hasScrolledCharter, setHasScrolledCharter] = useState(false)
  const [hasScrolledImageRights, setHasScrolledImageRights] = useState(false)
  const [charterAccepted, setCharterAccepted] = useState(false)
  // No default: the member must pick explicitly (true/false both valid).
  const [imageRightsChoice, setImageRightsChoice] = useState<ImageRightsChoice | undefined>(undefined)

  const markCharterRead = useCallback(() => setHasScrolledCharter(true), [])
  const markImageRightsRead = useCallback(() => setHasScrolledImageRights(true), [])

  const acceptCharter = useMutation({
    // Non-null: router.tsx only reaches CharterPage through RequireSession,
    // which already redirects to /login when there's no user.
    mutationFn: () =>
      acceptCharterUseCase.execute({ userId: user!.id, imageRightsConsent: imageRightsChoice === 'authorize' }),
    onSuccess: async () => {
      await refreshUser()
      navigate('/', { replace: true })
    },
  })

  return {
    hasScrolledCharter,
    hasScrolledImageRights,
    markCharterRead,
    markImageRightsRead,
    charterAccepted,
    setCharterAccepted,
    imageRightsChoice,
    setImageRightsChoice,
    accept: () => acceptCharter.mutate(),
    canAccept: charterAccepted && imageRightsChoice !== undefined && !acceptCharter.isPending,
    isAccepting: acceptCharter.isPending,
  }
}
