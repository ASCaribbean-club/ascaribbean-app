import { describe, expect, it } from 'vitest'
import { toTimeOneHourBefore } from './date-input'

describe('toTimeOneHourBefore', () => {
  it('returns the time one hour earlier', () => {
    expect(toTimeOneHourBefore('15:30')).toBe('14:30')
    expect(toTimeOneHourBefore('01:00')).toBe('00:00')
  })

  it('returns an empty string when it would wrap to the previous day', () => {
    expect(toTimeOneHourBefore('00:30')).toBe('')
  })

  it('returns an empty string for an incomplete value', () => {
    expect(toTimeOneHourBefore('')).toBe('')
  })
})
