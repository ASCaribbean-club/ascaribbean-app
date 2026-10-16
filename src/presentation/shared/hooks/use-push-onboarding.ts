import { useQuery } from '@tanstack/react-query'
import { usePushNotificationsDependencies } from '@presentation/di/hooks/use-push-notifications-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/mob-notifications.md AC-NT-37..39 — runs the silent re-sync once per
// signed-in launch/login and shares its result between the host and the
// What's new dialog through the same query key. gcTime 0: the entry is dropped
// when the signed-in tree unmounts (sign-out), so the next login re-runs it
// without a page reload. Not retried within a session.
export function usePushOnboarding() {
  const { autoEnablePushNotificationsUseCase } = usePushNotificationsDependencies()
  const { user } = useAuth()
  const userId = user!.id
  return useQuery({
    queryKey: queryKeys.pushOnboarding(userId),
    queryFn: () => autoEnablePushNotificationsUseCase.execute(userId),
    staleTime: Infinity,
    gcTime: 0,
    retry: false,
    refetchOnWindowFocus: false,
  })
}
