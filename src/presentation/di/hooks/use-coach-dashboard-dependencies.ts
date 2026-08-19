import { useDomainDependencies } from './use-domain-dependencies'

export function useCoachDashboardDependencies() {
  return useDomainDependencies('CoachDashboard', (container) => container.coachDashboard)
}
