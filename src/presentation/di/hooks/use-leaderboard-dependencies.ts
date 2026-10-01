import { useDomainDependencies } from './use-domain-dependencies'

export function useLeaderboardDependencies() {
  return useDomainDependencies('Leaderboard', (container) => container.leaderboard)
}
