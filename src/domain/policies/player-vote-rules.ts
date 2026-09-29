/**
 * specs/player-vote.md PO-PV-06(d), resolved 2026-09-29 (developer
 * decision): voting only opens once the match has kicked off — a vote cast
 * before `convocations.date` is refused. This resolves only the OPENING
 * half of PO-PV-06; the 48h-after-match CLOSING half stays open, no basis
 * in any scoping document yet (see CastVoteUseCase's own comment).
 *
 * `kickoff` must be `convocations.date` (the kickoff instant), same
 * caution as `isMatchResultRecordable`'s own comment in
 * match-result-timing-rules.ts. `now` passed in rather than read
 * internally, same pattern as every other timing predicate in this folder.
 *
 * Comparison is strict (`>`): a vote cast exactly at kickoff is refused —
 * same boundary semantics as `isMatchResultRecordable`.
 */
export function isVotingOpen(kickoff: Date, now: Date): boolean {
  return now > kickoff
}
