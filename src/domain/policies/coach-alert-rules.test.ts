import { describe, expect, it } from 'vitest'
import type { Convocation } from '../entities/convocation'
import type { MatchDetails } from '../entities/match-details'
import {
  getCoachAlertActions,
  hasAnyMissingCoachAction,
  missingAttendanceConfirmation,
  missingGoalAttribution,
  missingMatchScore,
} from './coach-alert-rules'

function convocationWith(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-18T18:00:00.000Z',
    location: 'Stade municipal',
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    ...overrides,
  }
}

function matchDetailsWith(overrides: Partial<MatchDetails> = {}): MatchDetails {
  return {
    convocationId: 'c1',
    opponentId: 'opponent-1',
    isHome: true,
    meetingPointTime: null,
    meetingPointLocation: null,
    goalsFor: null,
    goalsAgainst: null,
    ...overrides,
  }
}

const now = new Date('2026-08-18T20:00:00.000Z')

describe('missingAttendanceConfirmation — signal A', () => {
  it('is true for an open convocation whose date is in the past', () => {
    expect(missingAttendanceConfirmation(convocationWith({ status: 'open', date: '2026-08-18T09:00:00.000Z' }), now)).toBe(true)
  })

  it('is false for an open convocation whose date is in the future', () => {
    expect(missingAttendanceConfirmation(convocationWith({ status: 'open', date: '2026-08-25T09:00:00.000Z' }), now)).toBe(false)
  })

  it('is false for a convocation whose date is exactly now (boundary — not past yet)', () => {
    expect(missingAttendanceConfirmation(convocationWith({ status: 'open', date: now.toISOString() }), now)).toBe(false)
  })

  it('is false for a closed convocation, even in the past (attendance already fully constated)', () => {
    expect(missingAttendanceConfirmation(convocationWith({ status: 'closed', date: '2026-08-18T09:00:00.000Z' }), now)).toBe(false)
  })

  it('is false for a cancelled convocation, even in the past (AC-AL-06)', () => {
    expect(missingAttendanceConfirmation(convocationWith({ status: 'cancelled', date: '2026-08-18T09:00:00.000Z' }), now)).toBe(false)
  })

  it('applies to every convocation type, not just matches', () => {
    expect(missingAttendanceConfirmation(convocationWith({ type: 'meeting', status: 'open', date: '2026-08-18T09:00:00.000Z' }), now)).toBe(true)
  })
})

describe('missingMatchScore — signal B', () => {
  it('is false for a non-match convocation', () => {
    expect(missingMatchScore(convocationWith({ type: 'training', date: '2026-08-18T09:00:00.000Z' }), null, now)).toBe(false)
  })

  it('is false for a cancelled match, even past kickoff with no score (AC-AL-06 — written explicitly, not inherited)', () => {
    const convocation = convocationWith({ type: 'match', status: 'cancelled', date: '2026-08-18T09:00:00.000Z' })
    expect(missingMatchScore(convocation, null, now)).toBe(false)
  })

  it('is false before kickoff (AC-AL-01 — kickoff not yet passed)', () => {
    const convocation = convocationWith({ type: 'match', date: '2026-08-25T09:00:00.000Z' })
    expect(missingMatchScore(convocation, null, now)).toBe(false)
  })

  it('is false when kickoff is exactly now (boundary — not recordable yet)', () => {
    const convocation = convocationWith({ type: 'match', date: now.toISOString() })
    expect(missingMatchScore(convocation, null, now)).toBe(false)
  })

  it('is true past kickoff with no MatchDetails row at all', () => {
    const convocation = convocationWith({ type: 'match', date: '2026-08-18T09:00:00.000Z' })
    expect(missingMatchScore(convocation, null, now)).toBe(true)
  })

  it('is true past kickoff with goalsFor still null', () => {
    const convocation = convocationWith({ type: 'match', date: '2026-08-18T09:00:00.000Z' })
    expect(missingMatchScore(convocation, matchDetailsWith({ goalsFor: null, goalsAgainst: null }), now)).toBe(true)
  })

  it('is false once a score is recorded', () => {
    const convocation = convocationWith({ type: 'match', date: '2026-08-18T09:00:00.000Z' })
    expect(missingMatchScore(convocation, matchDetailsWith({ goalsFor: 2, goalsAgainst: 1 }), now)).toBe(false)
  })

  it('is true for a closed match with no score (AC-AL-07 — not conditioned on status === open)', () => {
    const convocation = convocationWith({ type: 'match', status: 'closed', date: '2026-08-18T09:00:00.000Z' })
    expect(missingMatchScore(convocation, null, now)).toBe(true)
  })
})

describe('missingGoalAttribution — signal C', () => {
  it('is false for a non-match convocation', () => {
    expect(missingGoalAttribution(convocationWith({ type: 'training' }), null, 0)).toBe(false)
  })

  it('is false for a cancelled match, even with an incomplete attribution (AC-AL-06 — written explicitly)', () => {
    const convocation = convocationWith({ type: 'match', status: 'cancelled' })
    expect(missingGoalAttribution(convocation, matchDetailsWith({ goalsFor: 3, goalsAgainst: 0 }), 1)).toBe(false)
  })

  it('is false when no score has been recorded yet (goalsFor null)', () => {
    const convocation = convocationWith({ type: 'match' })
    expect(missingGoalAttribution(convocation, matchDetailsWith({ goalsFor: null, goalsAgainst: null }), 0)).toBe(false)
  })

  it('is false when goalsFor is 0 (AC-AL-08 — nothing to attribute, never a false positive on a 0-N loss)', () => {
    const convocation = convocationWith({ type: 'match' })
    expect(missingGoalAttribution(convocation, matchDetailsWith({ goalsFor: 0, goalsAgainst: 3 }), 0)).toBe(false)
  })

  it('is true when attributedCount is strictly less than goalsFor', () => {
    const convocation = convocationWith({ type: 'match' })
    expect(missingGoalAttribution(convocation, matchDetailsWith({ goalsFor: 3, goalsAgainst: 0 }), 2)).toBe(true)
  })

  it('is false once attributedCount equals goalsFor (boundary — fully attributed)', () => {
    const convocation = convocationWith({ type: 'match' })
    expect(missingGoalAttribution(convocation, matchDetailsWith({ goalsFor: 3, goalsAgainst: 0 }), 3)).toBe(false)
  })

  it('is true for a closed match with an incomplete attribution (AC-AL-07 — not conditioned on status === open)', () => {
    const convocation = convocationWith({ type: 'match', status: 'closed' })
    expect(missingGoalAttribution(convocation, matchDetailsWith({ goalsFor: 2, goalsAgainst: 0 }), 0)).toBe(true)
  })
})

describe('getCoachAlertActions / hasAnyMissingCoachAction — AC-AL-08 cumulation', () => {
  it('cumulates signal A and signal B on the same past open match with no score', () => {
    const convocation = convocationWith({ type: 'match', status: 'open', date: '2026-08-18T09:00:00.000Z' })
    const actions = getCoachAlertActions(convocation, null, 0, now)

    expect(actions).toEqual({ attendanceConfirmationMissing: true, matchScoreMissing: true, goalAttributionMissing: false })
    expect(hasAnyMissingCoachAction(actions)).toBe(true)
  })

  it('cumulates signal A and signal C on a past open match with an incomplete attribution', () => {
    const convocation = convocationWith({ type: 'match', status: 'open', date: '2026-08-18T09:00:00.000Z' })
    const matchDetails = matchDetailsWith({ goalsFor: 2, goalsAgainst: 0 })
    const actions = getCoachAlertActions(convocation, matchDetails, 1, now)

    expect(actions).toEqual({ attendanceConfirmationMissing: true, matchScoreMissing: false, goalAttributionMissing: true })
  })

  it('never flags both B and C together — structurally exclusive on goalsFor null vs not-null', () => {
    const convocation = convocationWith({ type: 'match', status: 'closed', date: '2026-08-18T09:00:00.000Z' })
    const noScore = getCoachAlertActions(convocation, null, 0, now)
    expect(noScore.matchScoreMissing && noScore.goalAttributionMissing).toBe(false)

    const withScore = getCoachAlertActions(convocation, matchDetailsWith({ goalsFor: 1, goalsAgainst: 0 }), 0, now)
    expect(withScore.matchScoreMissing && withScore.goalAttributionMissing).toBe(false)
  })

  it('reports no missing action for a fully up-to-date closed match', () => {
    const convocation = convocationWith({ type: 'match', status: 'closed', date: '2026-08-18T09:00:00.000Z' })
    const matchDetails = matchDetailsWith({ goalsFor: 2, goalsAgainst: 1 })
    const actions = getCoachAlertActions(convocation, matchDetails, 2, now)

    expect(hasAnyMissingCoachAction(actions)).toBe(false)
  })
})
