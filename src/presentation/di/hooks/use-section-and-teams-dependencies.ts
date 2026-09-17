import { useDomainDependencies } from './use-domain-dependencies'

export function useSectionAndTeamsDependencies() {
  return useDomainDependencies('SectionAndTeams', (container) => container.sectionAndTeams)
}
