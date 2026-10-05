import { useDomainDependencies } from './use-domain-dependencies'

export function useNotificationsDependencies() {
  return useDomainDependencies('Notifications', (container) => container.notifications)
}
