import { useDomainDependencies } from './use-domain-dependencies'

export function useCoachTeamStatsDependencies() {
  return useDomainDependencies('CoachTeamStats', (container) => container.coachTeamStats)
}
