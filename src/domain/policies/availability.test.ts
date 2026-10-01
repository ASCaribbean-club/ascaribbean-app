import { describe, expect, it } from 'vitest'
import type { MedicalUnavailability, SuspensionUnavailability } from '@domain/entities/unavailability'
import { getAvailabilityStatus, isUnavailabilityActive, toTeammateStatus } from '@domain/policies/availability'

// Local-time constructor: the policy compares the device's local calendar day.
const day = (iso: string) => {
  const [y, m, d] = iso.split('-').map(Number)
  return new Date(y, m - 1, d, 12, 0, 0)
}

function medical(startsOn: string, expectedReturnOn: string | null): MedicalUnavailability {
  return { id: 'm1', userId: 'u1', kind: 'medical', startsOn, expectedReturnOn, declaredBy: 'c1', declaredAt: '2026-09-01T08:00:00Z' }
}

function suspension(startsOn: string, liftedOn: string | null): SuspensionUnavailability {
  return { id: 's1', userId: 'u1', kind: 'suspension', startsOn, liftedOn, matchCount: 2, reason: null, declaredBy: 'c1', declaredAt: '2026-09-01T08:00:00Z' }
}

describe('isUnavailabilityActive', () => {
  describe.each([
    ['medical', (s: string, e: string | null) => medical(s, e)],
    ['suspension', (s: string, e: string | null) => suspension(s, e)],
  ] as const)('%s', (_kind, make) => {
    const u = make('2026-10-10', '2026-10-20')

    it('is inactive the day before startsOn', () => {
      expect(isUnavailabilityActive(u, day('2026-10-09'))).toBe(false)
    })
    it('is active ON startsOn (inclusive)', () => {
      expect(isUnavailabilityActive(u, day('2026-10-10'))).toBe(true)
    })
    it('is active in between and the day before the end', () => {
      expect(isUnavailabilityActive(u, day('2026-10-15'))).toBe(true)
      expect(isUnavailabilityActive(u, day('2026-10-19'))).toBe(true)
    })
    it('is inactive ON the end date (exclusive) and after', () => {
      expect(isUnavailabilityActive(u, day('2026-10-20'))).toBe(false)
      expect(isUnavailabilityActive(u, day('2026-11-01'))).toBe(false)
    })
    it('ignores the time of day on the boundary days', () => {
      expect(isUnavailabilityActive(u, new Date(2026, 9, 10, 0, 0, 0))).toBe(true)
      expect(isUnavailabilityActive(u, new Date(2026, 9, 20, 0, 0, 0))).toBe(false)
      expect(isUnavailabilityActive(u, new Date(2026, 9, 19, 23, 59, 59))).toBe(true)
    })
    it('with a null end is inactive before start, active from start indefinitely', () => {
      const open = make('2026-10-10', null)
      expect(isUnavailabilityActive(open, day('2026-10-09'))).toBe(false)
      expect(isUnavailabilityActive(open, day('2026-10-10'))).toBe(true)
      expect(isUnavailabilityActive(open, day('2030-01-01'))).toBe(true)
    })
  })
})

describe('getAvailabilityStatus', () => {
  const now = day('2026-10-15')

  it('returns available for an empty list', () => {
    expect(getAvailabilityStatus([], now)).toBe('available')
  })
  it('returns available when every entry is inactive (past or future)', () => {
    expect(getAvailabilityStatus([medical('2026-09-01', '2026-09-10'), suspension('2026-11-01', null)], now)).toBe('available')
  })
  it('returns medical when only a medical is active', () => {
    expect(getAvailabilityStatus([medical('2026-10-01', null), suspension('2026-09-01', '2026-09-05')], now)).toBe('medical')
  })
  it('returns suspended when only a suspension is active', () => {
    expect(getAvailabilityStatus([suspension('2026-10-01', null)], now)).toBe('suspended')
  })
  it('returns medical when both are active, whatever the order (provisional rule)', () => {
    const m = medical('2026-10-01', null)
    const s = suspension('2026-10-01', null)
    expect(getAvailabilityStatus([m, s], now)).toBe('medical')
    expect(getAvailabilityStatus([s, m], now)).toBe('medical')
  })
  it('flips status exactly at the boundaries', () => {
    const list = [medical('2026-10-15', '2026-10-18')]
    expect(getAvailabilityStatus(list, day('2026-10-14'))).toBe('available')
    expect(getAvailabilityStatus(list, day('2026-10-15'))).toBe('medical')
    expect(getAvailabilityStatus(list, day('2026-10-17'))).toBe('medical')
    expect(getAvailabilityStatus(list, day('2026-10-18'))).toBe('available')
  })
})

describe('toTeammateStatus', () => {
  it('passes available through', () => {
    expect(toTeammateStatus('available')).toBe('available')
  })
  it('passes suspended through', () => {
    expect(toTeammateStatus('suspended')).toBe('suspended')
  })
  it('hides medical as unavailable', () => {
    expect(toTeammateStatus('medical')).toBe('unavailable')
  })
})
