import { describe, expect, it } from 'vitest'
import { isValidMatchSchedule } from './match-scheduling-rules'

describe('isValidMatchSchedule', () => {
  it('is true when the RDV time is earlier the same day as kickoff', () => {
    const rdv = new Date('2026-09-05T13:30:00.000Z')
    const kickoff = new Date('2026-09-05T15:00:00.000Z')
    expect(isValidMatchSchedule(rdv, kickoff)).toBe(true)
  })

  it('is false when the RDV time is after kickoff, same day', () => {
    const rdv = new Date('2026-09-05T16:00:00.000Z')
    const kickoff = new Date('2026-09-05T15:00:00.000Z')
    expect(isValidMatchSchedule(rdv, kickoff)).toBe(false)
  })

  it('is false when the RDV time equals kickoff exactly', () => {
    const time = new Date('2026-09-05T15:00:00.000Z')
    expect(isValidMatchSchedule(time, time)).toBe(false)
  })

  it('is false when the RDV is the day before kickoff, even if earlier in the clock', () => {
    const rdv = new Date('2026-09-04T20:00:00.000Z')
    const kickoff = new Date('2026-09-05T15:00:00.000Z')
    expect(isValidMatchSchedule(rdv, kickoff)).toBe(false)
  })

  it('is false when the RDV is on a later day than kickoff', () => {
    const rdv = new Date('2026-09-06T10:00:00.000Z')
    const kickoff = new Date('2026-09-05T15:00:00.000Z')
    expect(isValidMatchSchedule(rdv, kickoff)).toBe(false)
  })
})
