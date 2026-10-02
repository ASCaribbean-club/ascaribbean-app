import { describe, expect, it } from 'vitest'
import type { Convocation } from '../entities/convocation'
import { isMissionSelfServiceOpen, MISSION_SELF_SERVICE_DEADLINE_MINUTES } from './mission-deadline'

const START = '2026-10-10T18:00:00.000Z'

function convocationWith(overrides: Partial<Pick<Convocation, 'date' | 'status'>> = {}): Pick<Convocation, 'date' | 'status'> {
  return { date: START, status: 'open', ...overrides }
}

// specs/match-details-missions.md AC-MM-11
describe('isMissionSelfServiceOpen', () => {
  it('uses a fixed 30-minute delay', () => {
    expect(MISSION_SELF_SERVICE_DEADLINE_MINUTES).toBe(30)
  })

  it('is open at start minus 31 minutes', () => {
    expect(isMissionSelfServiceOpen(convocationWith(), new Date('2026-10-10T17:29:00.000Z'))).toBe(true)
  })

  it('is closed exactly at start minus 30 minutes (strictly before)', () => {
    expect(isMissionSelfServiceOpen(convocationWith(), new Date('2026-10-10T17:30:00.000Z'))).toBe(false)
  })

  it('is closed after the deadline and after the start', () => {
    expect(isMissionSelfServiceOpen(convocationWith(), new Date('2026-10-10T17:45:00.000Z'))).toBe(false)
    expect(isMissionSelfServiceOpen(convocationWith(), new Date('2026-10-10T19:00:00.000Z'))).toBe(false)
  })

  it.each(['closed', 'cancelled'] as const)('is closed when the convocation is %s, even long before the start', (status) => {
    expect(isMissionSelfServiceOpen(convocationWith({ status }), new Date('2026-10-01T10:00:00.000Z'))).toBe(false)
  })
})
