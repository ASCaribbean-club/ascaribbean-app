import { useDomainDependencies } from './use-domain-dependencies'

export function usePlayerStatsDependencies() {
  return useDomainDependencies('PlayerStats', (container) => container.playerStats)
}
