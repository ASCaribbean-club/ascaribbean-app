import type { LegacyPlayerPoints, LegacyRankedPlayer } from '../entities/leaderboard'

// Same ranking rule as rankLeaderboard / rankPresenceLeaderboard (standard
// competition rank, ties share it, zero kept and muted), applied to Legacy
// points. A negative total (corrections) ranks below zero and is not muted
// differently. Display order in a tie: name, then userId.
export function rankLegacyLeaderboard(players: LegacyPlayerPoints[]): LegacyRankedPlayer[] {
  const sorted = [...players].sort(
    (a, b) =>
      b.points - a.points ||
      a.displayName.localeCompare(b.displayName, 'fr', { sensitivity: 'base' }) ||
      (a.userId < b.userId ? -1 : a.userId > b.userId ? 1 : 0),
  )

  let previousValue: number | null = null
  let previousRank = 0
  return sorted.map((player, index) => {
    const rank = player.points === previousValue ? previousRank : index + 1
    previousValue = player.points
    previousRank = rank
    return { ...player, rank, value: player.points, isMuted: player.points <= 0 }
  })
}
