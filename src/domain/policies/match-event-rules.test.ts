import { describe, expect, it } from 'vitest'
import { isValidPenaltyFlag } from './match-event-rules'

describe('isValidPenaltyFlag', () => {
  it('accepts isPenalty = true on a goal (AC-MS-16, converted penalty)', () => {
    expect(isValidPenaltyFlag('goal', true)).toBe(true)
  })

  it('accepts isPenalty = false on a goal (ordinary goal)', () => {
    expect(isValidPenaltyFlag('goal', false)).toBe(true)
  })

  it('rejects isPenalty = true on penalty_missed — that event type carries the fact on its own', () => {
    expect(isValidPenaltyFlag('penalty_missed', true)).toBe(false)
  })

  it('accepts isPenalty = false on penalty_missed', () => {
    expect(isValidPenaltyFlag('penalty_missed', false)).toBe(true)
  })

  it('rejects isPenalty = true on a yellow_card', () => {
    expect(isValidPenaltyFlag('yellow_card', true)).toBe(false)
  })

  it('rejects isPenalty = true on a red_card', () => {
    expect(isValidPenaltyFlag('red_card', true)).toBe(false)
  })

  it('accepts isPenalty = false on a red_card', () => {
    expect(isValidPenaltyFlag('red_card', false)).toBe(true)
  })
})
