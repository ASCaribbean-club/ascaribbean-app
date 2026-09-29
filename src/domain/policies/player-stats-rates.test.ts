import { describe, expect, it } from 'vitest'
import type { AttendanceSummary } from '../entities/attendance-summary'
import type { ResponseSummary } from '../entities/response-summary'
import { attendanceRate, responseRate } from './player-stats-rates'

describe('attendanceRate', () => {
  // AC-PS-17 — the boundary case named explicitly by the spec: a zero
  // denominator (no session validated by the coach yet) must return `null`,
  // never `NaN`, never `0`, never `100%`.
  it('returns null when validatedCount is exactly zero, even if presentCount is also zero', () => {
    const summary: AttendanceSummary = { validatedCount: 0, presentCount: 0 }
    expect(attendanceRate(summary)).toBeNull()
  })

  it('never returns NaN for a zero denominator (0/0 case)', () => {
    const summary: AttendanceSummary = { validatedCount: 0, presentCount: 0 }
    expect(attendanceRate(summary)).not.toBeNaN()
    expect(attendanceRate(summary)).toBeNull()
  })

  it('returns a ratio of 1 (100%) when every validated session was present', () => {
    const summary: AttendanceSummary = { validatedCount: 12, presentCount: 12 }
    expect(attendanceRate(summary)).toBe(1)
  })

  it('returns a ratio of 0 (0%) when no validated session was present — a real 0, not the zero-denominator null', () => {
    const summary: AttendanceSummary = { validatedCount: 12, presentCount: 0 }
    expect(attendanceRate(summary)).toBe(0)
  })

  it('returns a fractional ratio for a partial attendance record (AC-PS-16 example: 15/20)', () => {
    const summary: AttendanceSummary = { validatedCount: 20, presentCount: 15 }
    expect(attendanceRate(summary)).toBeCloseTo(0.75)
  })

  // AC-PS-01 — this function only ever reads AttendanceSummary's own two
  // fields; a smoke test that it doesn't reach for anything response-shaped.
  it('is computed exclusively from validatedCount/presentCount (AC-PS-01)', () => {
    const summary: AttendanceSummary = { validatedCount: 4, presentCount: 3 }
    expect(attendanceRate(summary)).toBeCloseTo(0.75)
  })
})

describe('responseRate', () => {
  it('returns null when convocatedCount is exactly zero, even if respondedCount is also zero', () => {
    const summary: ResponseSummary = { convocatedCount: 0, respondedCount: 0 }
    expect(responseRate(summary)).toBeNull()
  })

  it('never returns NaN for a zero denominator (0/0 case)', () => {
    const summary: ResponseSummary = { convocatedCount: 0, respondedCount: 0 }
    expect(responseRate(summary)).not.toBeNaN()
    expect(responseRate(summary)).toBeNull()
  })

  it('returns a ratio of 1 (100%) when every past convocation got a response', () => {
    const summary: ResponseSummary = { convocatedCount: 10, respondedCount: 10 }
    expect(responseRate(summary)).toBe(1)
  })

  it('returns a ratio of 0 (0%) when no past convocation got a response — a real 0, not the zero-denominator null', () => {
    const summary: ResponseSummary = { convocatedCount: 10, respondedCount: 0 }
    expect(responseRate(summary)).toBe(0)
  })

  it('returns a fractional ratio for a partial response record', () => {
    const summary: ResponseSummary = { convocatedCount: 20, respondedCount: 15 }
    expect(responseRate(summary)).toBeCloseTo(0.75)
  })
})
