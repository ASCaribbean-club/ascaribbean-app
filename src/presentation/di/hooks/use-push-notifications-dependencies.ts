import { useDomainDependencies } from './use-domain-dependencies'

export function usePushNotificationsDependencies() {
  return useDomainDependencies('PushNotifications', (container) => container.pushNotifications)
}
