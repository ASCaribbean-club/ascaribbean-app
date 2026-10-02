import type { PresenceEntry, PresencePlayerCounts } from '../entities/leaderboard'

// Whole percent, null when there is nothing to rate (0 denominator).
export function percentage(numerator: number, denominator: number): number | null {
  if (denominator <= 0) return null
  return Math.round((numerator / denominator) * 100)
}

// Same ranking rule as rankLeaderboard (standard competition rank, ties share
// it, zero kept and muted), applied to confirmed presences. Display order in
// a tie: name, then userId.
export function rankPresenceLeaderboard(players: PresencePlayerCounts[]): PresenceEntry[] {
  const sorted = [...players].sort(
    (a, b) =>
      b.presentCount - a.presentCount ||
      a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }) ||
      (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
  )

  let previousValue: number | null = null
  let previousRank = 0
  return sorted.map((player, index) => {
    const rank = player.presentCount === previousValue ? previousRank : index + 1
    previousValue = player.presentCount
    previousRank = rank
    return {
      ...player,
      rank,
      value: player.presentCount,
      isMuted: player.presentCount === 0,
      attendanceRate: percentage(player.presentCount, player.validatedCount),
      responseRate: percentage(player.respondedCount, player.convokedCount),
    }
  })
}
