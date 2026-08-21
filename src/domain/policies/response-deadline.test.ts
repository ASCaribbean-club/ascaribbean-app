import { describe, expect, it } from 'vitest'
import type { Convocation } from '../entities/convocation'
import { canPlayerRespond } from './response-deadline'

function convocationWith(overrides: Partial<Convocation>): Convocation {
  return {
    id: 'c1',
    teamId: 'team-1',
    type: 'training',
    date: '2026-08-10T18:00:00.000Z',
    location: 'Gymnase',
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

describe('canPlayerRespond', () => {
  it('allows a response before the deadline for a training (10 min)', () => {
    const convocation = convocationWith({ type: 'training', date: '2026-08-10T18:00:00.000Z' })
    const now = new Date('2026-08-10T17:49:00.000Z')
    expect(canPlayerRespond(convocation, now)).toBe(true)
  })

  it('denies a response past the deadline for a training (10 min)', () => {
    const convocation = convocationWith({ type: 'training', date: '2026-08-10T18:00:00.000Z' })
    const now = new Date('2026-08-10T17:51:01.000Z')
    expect(canPlayerRespond(convocation, now)).toBe(false)
  })

  it('allows a response up to 60 min before a match', () => {
    const convocation = convocationWith({ type: 'match', date: '2026-08-10T18:00:00.000Z' })
    const now = new Date('2026-08-10T16:59:00.000Z')
    expect(canPlayerRespond(convocation, now)).toBe(true)
  })

  it('denies a response inside the 60 min window before a match', () => {
    const convocation = convocationWith({ type: 'match', date: '2026-08-10T18:00:00.000Z' })
    const now = new Date('2026-08-10T17:30:00.000Z')
    expect(canPlayerRespond(convocation, now)).toBe(false)
  })
})
