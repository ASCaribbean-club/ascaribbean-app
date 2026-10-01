import { describe, expect, it } from 'vitest'
import {
  adminConvocationDisplayStatus,
  canEnterAttendance,
  isAttendancePending,
  isConvocationEditable,
} from './convocation-admin-windows'

const NOW = new Date('2026-10-01T12:00:00.000Z')
const PAST = '2026-09-30T12:00:00.000Z'
const FUTURE = '2026-10-02T12:00:00.000Z'
const AT_NOW = NOW.toISOString()

describe('isConvocationEditable (mirror of the *_update_admin window)', () => {
  it('is editable when upcoming and open', () => {
    expect(isConvocationEditable({ date: FUTURE, status: 'open' }, NOW)).toBe(true)
  })

  it('is NOT editable when the date equals now (strict >, like the RLS)', () => {
    expect(isConvocationEditable({ date: AT_NOW, status: 'open' }, NOW)).toBe(false)
  })

  it('is not editable when past', () => {
    expect(isConvocationEditable({ date: PAST, status: 'open' }, NOW)).toBe(false)
  })

  it.each(['closed', 'cancelled'] as const)('is not editable when %s, even if upcoming', (status) => {
    expect(isConvocationEditable({ date: FUTURE, status }, NOW)).toBe(false)
  })
})

describe('canEnterAttendance (mirror of attendance_records_*_validate_admin)', () => {
  it('is allowed when past and open', () => {
    expect(canEnterAttendance({ date: PAST, status: 'open' }, NOW)).toBe(true)
  })

  it('is allowed when the date equals now (non-strict <=)', () => {
    expect(canEnterAttendance({ date: AT_NOW, status: 'open' }, NOW)).toBe(true)
  })

  it('is allowed after closure (a correction is admitted)', () => {
    expect(canEnterAttendance({ date: PAST, status: 'closed' }, NOW)).toBe(true)
  })

  it('is refused for an upcoming convocation', () => {
    expect(canEnterAttendance({ date: FUTURE, status: 'open' }, NOW)).toBe(false)
  })

  it('is refused for a cancelled convocation, even when past', () => {
    expect(canEnterAttendance({ date: PAST, status: 'cancelled' }, NOW)).toBe(false)
  })

  it('edit window and attendance window never overlap', () => {
    for (const date of [PAST, AT_NOW, FUTURE]) {
      const c = { date, status: 'open' as const }
      expect(isConvocationEditable(c, NOW) && canEnterAttendance(c, NOW)).toBe(false)
    }
  })
})

describe('isAttendancePending (PO-WC-04 definition)', () => {
  it('is pending when past and still open', () => {
    expect(isAttendancePending({ date: PAST, status: 'open' }, NOW)).toBe(true)
    expect(isAttendancePending({ date: AT_NOW, status: 'open' }, NOW)).toBe(true)
  })

  it.each([
    { date: FUTURE, status: 'open' as const },
    { date: PAST, status: 'closed' as const },
    { date: PAST, status: 'cancelled' as const },
  ])('is not pending for %j', (convocation) => {
    expect(isAttendancePending(convocation, NOW)).toBe(false)
  })
})

describe('adminConvocationDisplayStatus (AC-WC-07)', () => {
  it('shows an upcoming open convocation as open', () => {
    expect(adminConvocationDisplayStatus({ date: FUTURE, status: 'open' }, NOW)).toBe('open')
  })

  it('NEVER shows a past open convocation as closed: it is "past"', () => {
    expect(adminConvocationDisplayStatus({ date: PAST, status: 'open' }, NOW)).toBe('past')
  })

  it('shows closed only for a real closed status', () => {
    expect(adminConvocationDisplayStatus({ date: PAST, status: 'closed' }, NOW)).toBe('closed')
  })

  it('shows cancelled whatever the date', () => {
    expect(adminConvocationDisplayStatus({ date: FUTURE, status: 'cancelled' }, NOW)).toBe('cancelled')
    expect(adminConvocationDisplayStatus({ date: PAST, status: 'cancelled' }, NOW)).toBe('cancelled')
  })
})
