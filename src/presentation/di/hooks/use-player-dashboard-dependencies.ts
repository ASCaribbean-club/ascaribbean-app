import { useDomainDependencies } from './use-domain-dependencies'

export function usePlayerDashboardDependencies() {
  return useDomainDependencies('PlayerDashboard', (container) => container.playerDashboard)
}
