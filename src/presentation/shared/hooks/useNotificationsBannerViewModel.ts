import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import { usePushNotificationsDependencies } from '@presentation/di/hooks/use-push-notifications-dependencies'
import { useObservability } from '@presentation/di/hooks/use-observability'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

// Dashboard banner shared by the four dashboard views (same scope as
// DuesReminderBanner). A secondary read: loading and error render NOTHING, so
// it never degrades the dashboard. Whether it is relevant is decided by
// GetNotificationsBannerUseCase, never here. Refetched on mount and on window
// focus, so it disappears once notifications were enabled in Settings.
export function useNotificationsBannerViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const navigate = useNavigate()
  const observability = useObservability()
  const { getNotificationsBannerUseCase, dismissNotificationsBannerUseCase } = usePushNotificationsDependencies()

  const userId = user?.id ?? ''
  const queryKey = queryKeys.pushBanner(userId)
  const bannerQuery = useQuery({
    queryKey,
    queryFn: () => getNotificationsBannerUseCase.execute(userId),
    enabled: user !== null,
    refetchOnMount: 'always',
    refetchOnWindowFocus: 'always',
  })

  const dismissMutation = useMutation({
    mutationFn: async () => dismissNotificationsBannerUseCase.execute(userId),
    // The banner disappears immediately; the marker is a synchronous local write.
    onMutate: () => queryClient.setQueryData(queryKey, false),
  })

  return {
    showBanner: !bannerQuery.isError && bannerQuery.data === true,
    onOpenSettings: () => {
      observability.track({ name: 'alert_clicked', props: { alert: 'notifications_activation' } })
      navigate('/settings')
    },
    onDismiss: () => dismissMutation.mutate(),
  }
}
