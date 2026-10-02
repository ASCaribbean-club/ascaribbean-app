import type { LeaderboardPlayerCounts, PresencePlayerCounts } from '../entities/leaderboard'

export interface LeaderboardRepository {
  // Backed by the get_team_leaderboard database function: its own
  // is_team_member check is the authorization boundary. A team outside the
  // caller's scope (or outside the current season) resolves to [] — no
  // existence leak (AC-02).
  listTeamPlayerCounts(teamId: string): Promise<LeaderboardPlayerCounts[]>

  // Backed by get_team_presence_leaderboard — same boundary and empty-result
  // semantics as listTeamPlayerCounts.
  listTeamPresenceCounts(teamId: string): Promise<PresencePlayerCounts[]>
}
