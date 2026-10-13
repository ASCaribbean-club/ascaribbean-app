import { describe, expect, it } from 'vitest'
import type { AttendanceRecord } from '../entities/convocation'
import { isConvocationComplete } from './convocation-closure'

function recordFor(userId: string): AttendanceRecord {
  return {
    id: `rec-${userId}`,
    convocationId: 'c1',
    userId,
    actualStatus: 'present',
    absenceValidity: null,
    note: null,
    validatedBy: 'coach-1',
    validatedAt: '2026-08-10T18:30:00.000Z',
  }
}

describe('isConvocationComplete', () => {
  it('is false when no attendance records exist yet', () => {
    expect(isConvocationComplete(['u1', 'u2'], [])).toBe(false)
  })

  it('is false when some required players are missing a record', () => {
    expect(isConvocationComplete(['u1', 'u2'], [recordFor('u1')])).toBe(false)
  })

  it('is true when every required player has a record', () => {
    expect(isConvocationComplete(['u1', 'u2'], [recordFor('u1'), recordFor('u2')])).toBe(true)
  })

  it('is true even with extra, non-required records present', () => {
    expect(isConvocationComplete(['u1'], [recordFor('u1'), recordFor('guest-1')])).toBe(true)
  })

  it('is true trivially when no players are required', () => {
    expect(isConvocationComplete([], [])).toBe(true)
  })

  // AC-CPS-15 — the required ids are the CONVOKED players only: a record of a
  // non-convoked user never completes the set of a convoked one.
  it('is false when the only record belongs to a non-convoked user', () => {
    expect(isConvocationComplete(['convoked-1'], [recordFor('not-convoked')])).toBe(false)
  })
})
