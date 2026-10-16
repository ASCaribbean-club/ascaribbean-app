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

/**
 * Voting deadline, developer decision (2026-10-12): the closing half of
 * PO-PV-06. A vote is accepted for VOTING_DEADLINE_DAYS days counted from
 * kickoff + VOTING_DEADLINE_START_OFFSET_HOURS (end of the match, roughly).
 * Used by the dashboard reminder AND enforced by CastVoteUseCase; mirrored
 * manually in the votes_insert_cast / votes_update_cast RLS policies
 * (supabase/migrations/20261012090240_votes_closing_window.sql, moved from 3 to 2 days by
 * 20261016193133_votes_deadline_two_days.sql).
 */
export const VOTING_DEADLINE_DAYS = 2
export const VOTING_DEADLINE_START_OFFSET_HOURS = 1

const HOUR_MS = 60 * 60 * 1000
const DAY_MS = 24 * HOUR_MS

export function getVotingDeadline(kickoff: Date): Date {
  return new Date(kickoff.getTime() + VOTING_DEADLINE_START_OFFSET_HOURS * HOUR_MS + VOTING_DEADLINE_DAYS * DAY_MS)
}

/**
 * Strict, like `isVotingOpen`: a vote cast exactly at the deadline is refused.
 */
export function isVotingClosed(kickoff: Date, now: Date): boolean {
  return now >= getVotingDeadline(kickoff)
}

/**
 * Whole days left to vote, rounded up so the last partial day still reads
 * "1 jour" (never "0 jour"), and capped at VOTING_DEADLINE_DAYS (the first
 * hour after kickoff doesn't count). `null` outside the window: before
 * kickoff or once the deadline has passed.
 */
export function getVotingDaysRemaining(kickoff: Date, now: Date): number | null {
  if (!isVotingOpen(kickoff, now) || isVotingClosed(kickoff, now)) return null
  const remainingMs = getVotingDeadline(kickoff).getTime() - now.getTime()
  return Math.min(VOTING_DEADLINE_DAYS, Math.ceil(remainingMs / DAY_MS))
}
