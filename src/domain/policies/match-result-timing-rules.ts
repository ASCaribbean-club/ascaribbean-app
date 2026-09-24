/**
 * specs/match-stats.md MS-12/AC-MS-13 — score and events may only be
 * recorded AFTER kickoff. `kickoff` must be `convocations.date` (the
 * kickoff instant), never `match_details.meetingPointTime` (the RDV time,
 * which comes BEFORE kickoff and is a different field entirely — see
 * domain/entities/match-details.ts's own comment and
 * domain/entities/convocation.ts's `date` field comment).
 *
 * This is a USE-CASE-level guard, not an RLS/SQL one — MS-12's own
 * "accepted risk", same reasoning already applied to the response-window
 * check (`canPlayerRespond`, domain/policies/response-deadline.ts): the
 * database has no way to compare a row's own convocation kickoff against
 * "now" inside a CHECK constraint, so this stays application-level by
 * design, not by oversight.
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
