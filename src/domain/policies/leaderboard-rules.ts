import type { LeaderboardEntry, LeaderboardMetric, LeaderboardPlayerCounts } from '../entities/leaderboard'

// specs/mobile-leaderboard.md AC-LB-13/AC-LB-14 (PO-LB-02). Pure ranking
// rules — authorization lives in the database function, not here.

export function metricValue(player: LeaderboardPlayerCounts, metric: LeaderboardMetric): number {
  switch (metric) {
    case 'goals':
      return player.goalsCount
    case 'yellow':
      return player.yellowCount
    case 'red':
      return player.redCount
  }
}

// Display order inside a tie (never changes the rank): accent- and
// case-insensitive name, then userId as the last, deterministic resort.
function compareDisplayOrder(a: LeaderboardPlayerCounts, b: LeaderboardPlayerCounts): number {
  const byName = a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' })
  if (byName !== 0) return byName
  return a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0
}

// Standard competition ranking: values 9, 7, 7, 3 -> ranks 1, 2, 2, 4.
// Every roster player is kept, zero included (AC-LB-14).
export function rankLeaderboard(players: LeaderboardPlayerCounts[], metric: LeaderboardMetric): LeaderboardEntry[] {
  const sorted = [...players].sort((a, b) => metricValue(b, metric) - metricValue(a, metric) || compareDisplayOrder(a, b))

  let previousValue: number | null = null
  let previousRank = 0
  return sorted.map((player, index) => {
    const value = metricValue(player, metric)
    const rank = value === previousValue ? previousRank : index + 1
    previousValue = value
    previousRank = rank
    return { ...player, rank, value, isMuted: value === 0 }
  })
}
