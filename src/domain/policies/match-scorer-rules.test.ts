import { describe, expect, it } from 'vitest'
import { isEligibleScorer } from './match-scorer-rules'

describe('isEligibleScorer', () => {
  it('is eligible when the coach confirmed present (AttendanceRecord), regardless of any response', () => {
    expect(isEligibleScorer({ actualStatus: 'present', status: 'pending' })).toBe(true)
    expect(isEligibleScorer({ actualStatus: 'present', status: 'absent' })).toBe(true)
  })

  it('is NOT eligible when the coach confirmed absent, even if the player had declared present (AttendanceRecord overrides ConvocationResponse)', () => {
    expect(isEligibleScorer({ actualStatus: 'absent', status: 'present' })).toBe(false)
  })

  it('falls back to the declared ConvocationResponse when no AttendanceRecord exists yet', () => {
    expect(isEligibleScorer({ actualStatus: null, status: 'present' })).toBe(true)
  })

  it('is not eligible with neither a confirmed AttendanceRecord nor a present response', () => {
    expect(isEligibleScorer({ actualStatus: null, status: 'pending' })).toBe(false)
    expect(isEligibleScorer({ actualStatus: null, status: 'absent' })).toBe(false)
  })
})
