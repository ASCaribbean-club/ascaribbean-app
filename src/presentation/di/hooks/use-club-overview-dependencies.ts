import { useDomainDependencies } from './use-domain-dependencies'

export function useClubOverviewDependencies() {
  return useDomainDependencies('ClubOverview', (container) => container.clubOverview)
}
