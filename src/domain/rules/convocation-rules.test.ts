import { describe, expect, it } from 'vitest'
import type { Convocation } from '../entities/convocation'
import { isUpcoming } from './convocation-rules'

function convocationAt(date: string, status: Convocation['status'] = 'open'): Convocation {
  return {
    id: 'c1',
    teamId: 't1',
    type: 'training',
    date,
    location: 'Terrain principal',
    status,
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
  }
}

describe('isUpcoming', () => {
  const now = new Date('2026-08-18T12:00:00.000Z')

  it('is true for a convocation later the same day', () => {
    expect(isUpcoming(convocationAt('2026-08-18T18:30:00.000Z'), now)).toBe(true)
  })

  it('is true for a convocation on a future date', () => {
    expect(isUpcoming(convocationAt('2026-08-25T18:30:00.000Z'), now)).toBe(true)
  })

  it('is false for a convocation earlier the same day', () => {
    expect(isUpcoming(convocationAt('2026-08-18T09:00:00.000Z'), now)).toBe(false)
  })

  it('is false for a convocation on a past date', () => {
    expect(isUpcoming(convocationAt('2026-08-01T18:30:00.000Z'), now)).toBe(false)
  })

  it('is false for a cancelled convocation even with a future date', () => {
    expect(isUpcoming(convocationAt('2026-08-25T18:30:00.000Z', 'cancelled'), now)).toBe(false)
  })
})
