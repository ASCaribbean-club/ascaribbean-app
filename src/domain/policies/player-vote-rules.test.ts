import { describe, expect, it } from 'vitest'
import { getVotingDaysRemaining, isVotingClosed, isVotingOpen } from './player-vote-rules'

const KICKOFF = new Date('2026-09-24T18:00:00.000Z')

describe('isVotingOpen', () => {
  it('is false just before kickoff', () => {
    expect(isVotingOpen(KICKOFF, new Date('2026-09-24T17:59:59.000Z'))).toBe(false)
  })

  it('is false exactly at kickoff (strict comparison, boundary resolves to not-yet-open)', () => {
    expect(isVotingOpen(KICKOFF, new Date(KICKOFF))).toBe(false)
  })

  it('is true just after kickoff', () => {
    expect(isVotingOpen(KICKOFF, new Date('2026-09-24T18:00:01.000Z'))).toBe(true)
  })
})

describe('isVotingClosed', () => {
  const kickoff = new Date('2026-10-10T15:00:00.000Z')
  // deadline = kickoff + 1h + 2 days
  it('is false until the deadline and true from the deadline on (strict boundary)', () => {
    expect(isVotingClosed(kickoff, new Date('2026-10-12T15:59:59.000Z'))).toBe(false)
    expect(isVotingClosed(kickoff, new Date('2026-10-12T16:00:00.000Z'))).toBe(true)
  })
})

describe('getVotingDaysRemaining', () => {
  const kickoff = new Date('2026-10-10T15:00:00.000Z')

  it('is null before and exactly at kickoff', () => {
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-10T14:59:00.000Z'))).toBeNull()
    expect(getVotingDaysRemaining(kickoff, kickoff)).toBeNull()
  })

  it('stays at 2 days during the first hour after kickoff, then rounds partial days up', () => {
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-10T15:00:01.000Z'))).toBe(2)
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-10T16:00:00.000Z'))).toBe(2)
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-10T16:00:01.000Z'))).toBe(2)
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-11T16:00:01.000Z'))).toBe(1)
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-12T15:00:00.000Z'))).toBe(1)
  })

  it('is null once the deadline has passed', () => {
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-12T16:00:00.000Z'))).toBeNull()
    expect(getVotingDaysRemaining(kickoff, new Date('2026-10-20T15:00:00.000Z'))).toBeNull()
  })
})
