import { useDomainDependencies } from './use-domain-dependencies'

export function useSeasonsDependencies() {
  return useDomainDependencies('Seasons', (container) => container.seasons)
}
