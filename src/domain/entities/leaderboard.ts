// specs/mobile-leaderboard.md — read-only team ranking, three metrics.
export type LeaderboardMetric = 'goals' | 'yellow' | 'red'

// One roster player's raw counters for the current season (what the
// get_team_leaderboard function returns, mapped).
export interface LeaderboardPlayerCounts {
  userId: string
  displayName: string
  goalsCount: number
  yellowCount: number
  redCount: number
}

// One ranked line for a given metric. `rank` is a standard competition rank
// (1, 2, 2, 4) — tied players share it. `isMuted` is true when the value of
// the ranked metric is zero (AC-LB-14).
export interface LeaderboardEntry extends LeaderboardPlayerCounts {
  rank: number
  value: number
  isMuted: boolean
}

export type TeamLeaderboard = Record<LeaderboardMetric, LeaderboardEntry[]>
