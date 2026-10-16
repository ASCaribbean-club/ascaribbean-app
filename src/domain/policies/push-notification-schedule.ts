import type { Convocation, ConvocationType, DeclaredStatus } from '../entities/convocation'
import { canPlayerRespond } from './response-deadline'
import { getVotingDeadline, isVotingClosed, isVotingOpen, VOTING_DEADLINE_START_OFFSET_HOURS } from './player-vote-rules'

// specs/mob-notifications.md §1 (T1, T2, T5) — WHEN a push is due and to WHOM.
// Pure predicates, `now` always passed in. The server job
// (supabase/migrations/20261015120200_push_dispatch.sql,
// private.collect_due_push_notifications) mirrors every constant and rule of
// this file BY HAND (CLAUDE.md §7); both sides are commented with the same
// rule names. Never generated, keep them in sync together.

const HOUR_MS = 60 * 60 * 1000

// --- T2 — convocation without a response -----------------------------------

/**
 * Lead time, in hours before the start, from which the "no response yet" push
 * is due. Developer request: 24 h for a match or a meeting, 12 h for a
 * training. SQL mirror: `c_t2_lead_*` in private.collect_due_push_notifications.
 */
export const CONVOCATION_REMINDER_LEAD_HOURS: Record<ConvocationType, number> = {
  match: 24,
  meeting: 24,
  training: 12,
}

export function getConvocationReminderInstant(type: ConvocationType, startsAt: Date): Date {
  return new Date(startsAt.getTime() - CONVOCATION_REMINDER_LEAD_HOURS[type] * HOUR_MS)
}

export interface ConvocationReminderInput {
  convocation: Pick<Convocation, 'type' | 'date' | 'status'>
  // Is the account in the convocation's attendee list (convocation_attendees)?
  // A player who is not convoked never gets T2 (PO-CPS-03).
  isAttendee: boolean
  // The attendee's declared status, `null` when no convocation_responses row exists.
  declaredStatus: DeclaredStatus | null
}

/**
 * T2 eligibility, evaluated AT SEND TIME. Reuses `canPlayerRespond`, so a
 * cancelled/closed convocation or one past its response deadline never gets a
 * push. PO-NT-04 default: no upper bound besides that — a convocation created
 * (or an attendee added) after the threshold is notified on the next job pass
 * as long as responding is still possible. Dedupe is the send log's job.
 */
export function isConvocationReminderDue(input: ConvocationReminderInput, now: Date): boolean {
  const { convocation, isAttendee, declaredStatus } = input
  if (!isAttendee) return false
  if (declaredStatus === 'present' || declaredStatus === 'absent') return false
  const threshold = getConvocationReminderInstant(convocation.type, new Date(convocation.date))
  return now >= threshold && canPlayerRespond(convocation as Convocation, now)
}

// --- T1 — man-of-the-match vote reminder (two stages) ----------------------

export type VoteReminderStage = 'opening' | 'before_closing'

/**
 * PO-NT-28 default: the first push goes out at kickoff + 1 h (roughly the end
 * of the match), not at kickoff when `isVotingOpen` flips, so it doesn't land
 * while players are on the pitch. `isVotingOpen` itself is NOT modified.
 * SQL mirror: `c_t1_opening_offset`.
 */
export const VOTE_REMINDER_OPENING_OFFSET_HOURS = VOTING_DEADLINE_START_OFFSET_HOURS
/** PO-NT-03: second push 24 h before the vote closes. SQL mirror: `c_t1_before_closing`. */
export const VOTE_REMINDER_BEFORE_CLOSING_HOURS = 24

export function getVoteReminderInstant(stage: VoteReminderStage, kickoff: Date): Date {
  if (stage === 'opening') return new Date(kickoff.getTime() + VOTE_REMINDER_OPENING_OFFSET_HOURS * HOUR_MS)
  return new Date(getVotingDeadline(kickoff).getTime() - VOTE_REMINDER_BEFORE_CLOSING_HOURS * HOUR_MS)
}

export interface VoteReminderInput {
  kickoff: Date
  isCancelled: boolean
  // Has this account already cast a vote in the man_of_the_match category?
  hasVoted: boolean
}

/**
 * The T1 stage to send now, or `null`. Only the LATEST stage whose instant has
 * passed is returned — a player who joins the team mid-window never gets an
 * earlier stage as a catch-up (spec §1 T1). The same stage twice is the send
 * log's job (at most one push per stage, two per (account, match)).
 * Out of the voting window (`isVotingOpen` and not `isVotingClosed`), a voted
 * or cancelled match: nothing.
 */
export function getDueVoteReminderStage(input: VoteReminderInput, now: Date): VoteReminderStage | null {
  const { kickoff, isCancelled, hasVoted } = input
  if (isCancelled || hasVoted) return null
  if (!isVotingOpen(kickoff, now) || isVotingClosed(kickoff, now)) return null
  if (now >= getVoteReminderInstant('before_closing', kickoff)) return 'before_closing'
  if (now >= getVoteReminderInstant('opening', kickoff)) return 'opening'
  return null
}

// --- T5 — man-of-the-match announcement ------------------------------------

/**
 * Operational guard of the job (SQL mirror: `c_t5_lookback`): only votes that
 * closed within this many days are announced, so the first run on a populated
 * database doesn't announce every past match.
 */
export const MVP_ANNOUNCEMENT_LOOKBACK_DAYS = 7

export interface MvpAnnouncementInput {
  kickoff: Date
  isCancelled: boolean
  // Number of votes in the man_of_the_match category for this match.
  voteCount: number
}

/**
 * T5 is due once the vote is closed, for a non-cancelled match that received
 * at least one vote (no vote = no winner = no push), and no later than
 * MVP_ANNOUNCEMENT_LOOKBACK_DAYS after the closing.
 */
export function isMvpAnnouncementDue(input: MvpAnnouncementInput, now: Date): boolean {
  const { kickoff, isCancelled, voteCount } = input
  if (isCancelled || voteCount < 1) return false
  if (!isVotingClosed(kickoff, now)) return false
  const lookbackEnd = getVotingDeadline(kickoff).getTime() + MVP_ANNOUNCEMENT_LOOKBACK_DAYS * 24 * HOUR_MS
  return now.getTime() < lookbackEnd
}

export interface VoteTallyEntry {
  candidateId: string
  votes: number
}

/**
 * Winner(s) of ONE match — same rule as get_team_mvp (SQL:
 * private.match_winners): highest vote count, a tie returns EVERY tied
 * candidate, no entry = no winner. The in-app star and T5 share this rule.
 */
export function resolveMatchWinners(tally: VoteTallyEntry[]): string[] {
  const counted = tally.filter((entry) => entry.votes > 0)
  if (counted.length === 0) return []
  const max = Math.max(...counted.map((entry) => entry.votes))
  return counted.filter((entry) => entry.votes === max).map((entry) => entry.candidateId)
}

export interface HeldRole {
  userId: string
  role: string
  teamId: string | null
}

/**
 * T5 recipients (PO-NT-22): every `player` and `coach` of the match's team plus
 * every `authorized-officer` of the club (all teams), read on the roles the
 * account HOLDS. De-duplicated per account — a player/coach/officer gets one
 * push. Responsable de section, Trésorier, Référent médical, Bénévole and
 * Administrateur are not recipients on that title alone.
 */
export function resolveMvpAnnouncementRecipients(heldRoles: HeldRole[], matchTeamId: string): string[] {
  const recipients = new Set<string>()
  for (const held of heldRoles) {
    const isTeamMember = (held.role === 'player' || held.role === 'coach') && held.teamId === matchTeamId
    if (isTeamMember || held.role === 'authorized-officer') recipients.add(held.userId)
  }
  return [...recipients]
}
