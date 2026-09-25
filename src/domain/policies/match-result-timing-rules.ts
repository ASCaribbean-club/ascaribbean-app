/**
 * specs/match-stats.md MS-12/AC-MS-13 — score and events may only be
 * recorded AFTER kickoff. `kickoff` must be `convocations.date` (the
 * kickoff instant), never `match_details.meetingPointTime` (the RDV time,
 * which comes BEFORE kickoff and is a different field entirely — see
 * domain/entities/match-details.ts's own comment and
 * domain/entities/convocation.ts's `date` field comment).
 *
 * A USE-CASE-level guard first (fails fast, no round trip). Originally
 * documented here as MS-12's "accepted risk" — RLS supposedly couldn't
 * enforce the same timing check because a CHECK constraint requires an
 * IMMUTABLE expression and forbids `now()`. That reasoning conflated a
 * CHECK constraint with an RLS policy: `using`/`with check` clauses are NOT
 * bound by the IMMUTABLE restriction. Fixed at merge time with
 * feature/edit-match-details (2026-09-25) — `match_details_update_record_score`
 * (supabase/migrations/20260924100000_match_statistics_schema.sql, patched
 * in 20260925150603_edit_match_details_write_policy.sql's own merge-fix
 * section) now carries `c.date < now()` too, so this is genuine
 * defense-in-depth, not the sole enforcement.
 *
 * `now` is passed in rather than read internally, same pattern as every
 * other timing predicate in this folder (`canPlayerRespond`, `isNewsVisible`).
 * Comparison is strict (`>`): a match whose kickoff is exactly `now` has not
 * started yet — same "boundary resolves to the not-yet side" semantics as
 * `isNewsVisible`.
 */
export function isMatchResultRecordable(kickoff: Date, now: Date): boolean {
  return now > kickoff
}
