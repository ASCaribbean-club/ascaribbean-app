import { useDomainDependencies } from './use-domain-dependencies'

export function useTeamAvailabilityDependencies() {
  return useDomainDependencies('TeamAvailability', (container) => container.teamAvailability)
}
