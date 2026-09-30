import { getMatchOutcome, type MatchOutcome } from './match-outcome-rules'

// specs/coach-dashboard.md §1 point 7 (PO-1) / specs/player-dashboard.md
// PO-PD-07 — both now resolved (développeuse, 2026-09-30): the
// "résultats et compétitions" module they were waiting on is exactly what
// specs/match-stats.md built (MatchDetails.goalsFor/goalsAgainst +
// getMatchOutcome). Pure aggregation on matches already read one layer up
// (GetTeamRecentFormUseCase), same "domain/policies/*-rules.ts" shape as
// team-stats-rules.ts — plain arithmetic, no I/O.
export interface RecordedMatchResult {
  date: string // ISO — Convocation.date, used only to order matches
  goalsFor: number
  goalsAgainst: number
}

// Chronological (oldest first) so the returned strip reads left-to-right as
// "furthest past -> most recent", the same reading order the previous
// hardcoded RECENT_FORM literal used.
export function computeRecentForm(matches: RecordedMatchResult[], recentMatchCount: number): MatchOutcome[] {
  return [...matches]
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(-recentMatchCount)
    .map((match) => getMatchOutcome(match.goalsFor, match.goalsAgainst))
}

// Season-wide total (every recorded match, not just the recentMatchCount
// window above) — same scope as coach-team-stats' "Buts marqués" card,
// which sums the whole season rather than a recent slice.
export function sumGoals(matches: RecordedMatchResult[]): { goalsFor: number; goalsAgainst: number } {
  return matches.reduce(
    (totals, match) => ({
      goalsFor: totals.goalsFor + match.goalsFor,
      goalsAgainst: totals.goalsAgainst + match.goalsAgainst,
    }),
    { goalsFor: 0, goalsAgainst: 0 },
  )
}
