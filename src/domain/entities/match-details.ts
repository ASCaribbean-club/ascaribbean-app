// specs/create-convocation.md §2, corrected per the satellite-table pattern
// established for MeetingDetails (see meeting-details.ts): a nullable field
// whose validity depends on another column (Convocation.type) doesn't belong
// on Convocation itself — it goes on a 1:1 satellite entity, PK = FK, created
// only when the need is concrete (already true here: opponentId/isHome are
// PO-CV-02, meetingPointTime/meetingPointLocation are the RDV fields, the
// RDV/kickoff ordering rule is PO-CV-09 — all already specified, unlike
// training's still-undefined "programme" concept, see TrainingDetails TODO
// in convocation-rules.ts neighbourhood — no such file created here).
export interface MatchDetails {
  convocationId: string
  opponentId: string // references `opponents`, not `team_opponents` (§2)
  isHome: boolean
  // Coach feedback (2026-09-25): both nullable — a coach may create/save a
  // match without knowing the RDV yet (migration
  // 20260925142528_match_details_meeting_point_optional.sql relaxed the
  // `not null` constraint this file originally documented). `null` means
  // "not set", never an empty string.
  meetingPointTime: string | null // ISO — the "RDV" time, distinct from Convocation.date (kickoff)
  meetingPointLocation: string | null // free text — the "RDV" location, distinct from Convocation.location

  // specs/match-stats.md MS-01/AC-MS-01 — primary fact, NEVER derived from
  // match_events (see domain/policies/match-outcome-rules.ts, which reads
  // these two directly). Both null together = no score recorded yet (a
  // match not yet played, AC-MS-15's "score pas encore enregistré" state);
  // never one without the other (mirrored by
  // match_details_goals_both_or_none_check in
  // supabase/migrations/20260924100000_match_statistics_schema.sql).
  goalsFor: number | null
  goalsAgainst: number | null

  // specs/match-stats.md MS-06/AC-MS-06 — NOT added here. `competition_type`
  // requires a backfill decision the developer hasn't made yet (7 existing
  // match_details rows on the remote project as of 2026-09-24 — see the
  // STOP block at the top of
  // supabase/migrations/20260924100000_match_statistics_schema.sql). No
  // column exists to back a `competitionType` field, so it isn't added to
  // this entity — adding it here without a backing column would be exactly
  // the kind of silent guess the spec's stop-and-report rule forbids.
}

// specs/edit-match-details.md §5 — the three logistics fields a coach may
// correct before kickoff, deliberately NOT `MatchDetails` itself. The
// `Pick<>` is the non-negotiable part (per that spec): it makes writing
// `opponentId` (the match's identity, §1) or a future `goalsFor`/
// `goalsAgainst` (match-stats, a different branch/feature with an opposite
// time window — §1 "Note de fusion") through this path a COMPILE error,
// never a runtime guard someone has to remember to keep enforcing. Stays
// DERIVED from MatchDetails on purpose — adding a field to that entity does
// NOT automatically widen this type, whereas a hand-copied interface would
// eventually drift.
export type MatchArrangements = Pick<MatchDetails, 'isHome' | 'meetingPointTime' | 'meetingPointLocation'>
