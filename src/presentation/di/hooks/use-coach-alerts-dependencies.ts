import { useDomainDependencies } from './use-domain-dependencies'

export function useCoachAlertsDependencies() {
  return useDomainDependencies('CoachAlerts', (container) => container.coachAlerts)
}
