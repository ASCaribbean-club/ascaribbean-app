import { describe, expect, it } from 'vitest'
import { getMatchOutcome, isScorerCountConsistent } from './match-outcome-rules'

describe('getMatchOutcome', () => {
  it('is a win when goalsFor is greater than goalsAgainst', () => {
    expect(getMatchOutcome(2, 1)).toBe('win')
  })

  it('is a loss when goalsFor is less than goalsAgainst', () => {
    expect(getMatchOutcome(0, 1)).toBe('loss')
  })

  it('is a draw when goalsFor equals goalsAgainst, including 0-0', () => {
    expect(getMatchOutcome(1, 1)).toBe('draw')
    expect(getMatchOutcome(0, 0)).toBe('draw')
  })
})

describe('isScorerCountConsistent', () => {
  it('is true when fewer goal events than goalsFor are recorded (AC-MS-05, normal case)', () => {
    expect(isScorerCountConsistent(2, 0)).toBe(true)
    expect(isScorerCountConsistent(2, 1)).toBe(true)
  })

  it('is true when the recorded goal event count exactly equals goalsFor', () => {
    expect(isScorerCountConsistent(2, 2)).toBe(true)
  })

  it('is false when the recorded goal event count would exceed goalsFor', () => {
    expect(isScorerCountConsistent(2, 3)).toBe(false)
  })

  it('is false for any recorded event against a goalsFor of 0', () => {
    expect(isScorerCountConsistent(0, 1)).toBe(false)
  })
})
