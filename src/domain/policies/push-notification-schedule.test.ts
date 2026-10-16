import { describe, expect, it } from 'vitest'
import {
  getConvocationReminderInstant,
  getDueVoteReminderStage,
  getVoteReminderInstant,
  isConvocationReminderDue,
  isMvpAnnouncementDue,
  resolveMatchWinners,
  resolveMvpAnnouncementRecipients,
} from './push-notification-schedule'

const HOUR = 3_600_000
const kickoff = new Date('2026-10-20T15:00:00.000Z')
const at = (ms: number) => new Date(kickoff.getTime() + ms)

function conv(type: 'match' | 'training' | 'meeting', status: 'open' | 'closed' | 'cancelled' = 'open') {
  return { type, date: kickoff.toISOString(), status }
}

describe('T2 convocation reminder', () => {
  it('uses 24h for match/meeting and 12h for training', () => {
    expect(getConvocationReminderInstant('match', kickoff)).toEqual(at(-24 * HOUR))
    expect(getConvocationReminderInstant('meeting', kickoff)).toEqual(at(-24 * HOUR))
    expect(getConvocationReminderInstant('training', kickoff)).toEqual(at(-12 * HOUR))
  })

  const base = { isAttendee: true, declaredStatus: null } as const

  it('is due exactly at the threshold, not one ms before', () => {
    expect(isConvocationReminderDue({ ...base, convocation: conv('match') }, at(-24 * HOUR))).toBe(true)
    expect(isConvocationReminderDue({ ...base, convocation: conv('match') }, at(-24 * HOUR - 1))).toBe(false)
    expect(isConvocationReminderDue({ ...base, convocation: conv('training') }, at(-12 * HOUR))).toBe(true)
    expect(isConvocationReminderDue({ ...base, convocation: conv('training') }, at(-12 * HOUR - 1))).toBe(false)
  })

  it('is due for a pending response and stops once answered', () => {
    const now = at(-20 * HOUR)
    expect(isConvocationReminderDue({ ...base, convocation: conv('match'), declaredStatus: 'pending' }, now)).toBe(true)
    expect(isConvocationReminderDue({ ...base, convocation: conv('match'), declaredStatus: 'present' }, now)).toBe(false)
    expect(isConvocationReminderDue({ ...base, convocation: conv('match'), declaredStatus: 'absent' }, now)).toBe(false)
  })

  it('never targets a non-attendee, a cancelled convocation or a passed response deadline', () => {
    const now = at(-20 * HOUR)
    expect(isConvocationReminderDue({ ...base, isAttendee: false, convocation: conv('match') }, now)).toBe(false)
    expect(isConvocationReminderDue({ ...base, convocation: conv('match', 'cancelled') }, now)).toBe(false)
    // match deadline = kickoff - 60 min (canPlayerRespond)
    expect(isConvocationReminderDue({ ...base, convocation: conv('match') }, at(-60 * 60_000))).toBe(false)
    expect(isConvocationReminderDue({ ...base, convocation: conv('match') }, at(-60 * 60_000 - 1))).toBe(true)
  })
})

describe('T1 vote reminder stages', () => {
  const input = { kickoff, isCancelled: false, hasVoted: false }

  it('computes the two instants (kickoff + 1h, deadline - 24h)', () => {
    expect(getVoteReminderInstant('opening', kickoff)).toEqual(at(HOUR))
    expect(getVoteReminderInstant('before_closing', kickoff)).toEqual(at(HOUR + 48 * HOUR))
  })

  it('sends nothing before the opening instant', () => {
    expect(getDueVoteReminderStage(input, at(0))).toBeNull()
    expect(getDueVoteReminderStage(input, at(HOUR - 1))).toBeNull()
  })

  it('sends the opening stage from kickoff + 1h until the second instant', () => {
    expect(getDueVoteReminderStage(input, at(HOUR))).toBe('opening')
    expect(getDueVoteReminderStage(input, at(HOUR + 48 * HOUR - 1))).toBe('opening')
  })

  it('sends only the latest stage afterwards (no catch-up)', () => {
    expect(getDueVoteReminderStage(input, at(HOUR + 48 * HOUR))).toBe('before_closing')
  })

  it('stops at the voting deadline (strict, like isVotingClosed)', () => {
    expect(getDueVoteReminderStage(input, at(HOUR + 72 * HOUR - 1))).toBe('before_closing')
    expect(getDueVoteReminderStage(input, at(HOUR + 72 * HOUR))).toBeNull()
  })

  it('sends nothing when already voted or cancelled', () => {
    expect(getDueVoteReminderStage({ ...input, hasVoted: true }, at(2 * HOUR))).toBeNull()
    expect(getDueVoteReminderStage({ ...input, isCancelled: true }, at(2 * HOUR))).toBeNull()
  })
})

describe('T5 announcement', () => {
  const deadlineOffset = HOUR + 72 * HOUR
  const input = { kickoff, isCancelled: false, voteCount: 3 }

  it('is due from the closing instant', () => {
    expect(isMvpAnnouncementDue(input, at(deadlineOffset - 1))).toBe(false)
    expect(isMvpAnnouncementDue(input, at(deadlineOffset))).toBe(true)
  })

  it('needs at least one vote and a non-cancelled match', () => {
    expect(isMvpAnnouncementDue({ ...input, voteCount: 0 }, at(deadlineOffset))).toBe(false)
    expect(isMvpAnnouncementDue({ ...input, isCancelled: true }, at(deadlineOffset))).toBe(false)
  })

  it('stops after the lookback guard', () => {
    expect(isMvpAnnouncementDue(input, at(deadlineOffset + 7 * 24 * HOUR - 1))).toBe(true)
    expect(isMvpAnnouncementDue(input, at(deadlineOffset + 7 * 24 * HOUR))).toBe(false)
  })
})

describe('resolveMatchWinners', () => {
  it('returns the single most voted candidate', () => {
    expect(resolveMatchWinners([{ candidateId: 'a', votes: 2 }, { candidateId: 'b', votes: 5 }])).toEqual(['b'])
  })
  it('returns every tied candidate', () => {
    expect(resolveMatchWinners([{ candidateId: 'a', votes: 4 }, { candidateId: 'b', votes: 4 }, { candidateId: 'c', votes: 1 }])).toEqual(['a', 'b'])
  })
  it('returns nobody without votes', () => {
    expect(resolveMatchWinners([])).toEqual([])
  })
})

describe('resolveMvpAnnouncementRecipients', () => {
  const roles = [
    { userId: 'p1', role: 'player', teamId: 'T' },
    { userId: 'p2', role: 'player', teamId: 'OTHER' },
    { userId: 'c1', role: 'coach', teamId: 'T' },
    { userId: 'c2', role: 'coach', teamId: 'OTHER' },
    { userId: 'o1', role: 'authorized-officer', teamId: null },
    { userId: 's1', role: 'section-manager', teamId: null },
    { userId: 't1', role: 'treasurer', teamId: null },
    { userId: 'a1', role: 'admin', teamId: null },
    { userId: 'm1', role: 'medical-referent', teamId: null },
    { userId: 'v1', role: 'volunteer', teamId: null },
  ]

  it('targets players and coaches of the team plus every officer', () => {
    expect(resolveMvpAnnouncementRecipients(roles, 'T').sort()).toEqual(['c1', 'o1', 'p1'])
  })

  it('sends one push to an account holding several qualifying titles', () => {
    const multi = [
      { userId: 'x', role: 'player', teamId: 'T' },
      { userId: 'x', role: 'coach', teamId: 'T' },
      { userId: 'x', role: 'authorized-officer', teamId: null },
    ]
    expect(resolveMvpAnnouncementRecipients(multi, 'T')).toEqual(['x'])
  })
})
