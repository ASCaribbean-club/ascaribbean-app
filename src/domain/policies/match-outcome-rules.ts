// specs/match-stats.md MS-02/AC-MS-02 — victory/draw/defeat is DERIVED at
// read time, never persisted anywhere (no column, no field). Pure, no
// dependency on MatchDetails itself — callers (RecordMatchScoreUseCase's
// consumers, MatchOutcomeCard's ViewModel) pass the two already-read
// numbers rather than this file reaching into an entity, so the same rule
// works identically for a live MatchDetails and for team_match_record's own
// aggregated per-match numbers, if that ever needs it.
export type MatchOutcome = 'win' | 'draw' | 'loss'

export function getMatchOutcome(goalsFor: number, goalsAgainst: number): MatchOutcome {
  if (goalsFor > goalsAgainst) return 'win'
  if (goalsFor < goalsAgainst) return 'loss'
  return 'draw'
}

// specs/match-stats.md MS-05/AC-MS-05 — the number of 'goal' events
// recorded for a match must always stay <= goals_for (a goal whose scorer
// is unknown is simply never recorded, MS-05 — it never inflates this
// count above the true score). Used in BOTH directions: AddMatchEventUseCase
// checks it before inserting one more 'goal' event, RecordMatchScoreUseCase
// checks it before accepting a REVISED goalsFor that would fall below the
// count of goal events already on record (same rule, same function, no
// separate "can lower the score" predicate).
export function isScorerCountConsistent(goalsFor: number, recordedGoalEventCount: number): boolean {
  return recordedGoalEventCount <= goalsFor
}
