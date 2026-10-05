import { describe, expect, it } from 'vitest'
import type { TreasurerDue } from '../entities/treasurer-due'
import {
  REMINDER_COOLDOWN_DAYS,
  calendarDaysSince,
  isDuesAlertVisible,
  isReminderEligible,
  nextReminderAt,
  reminderEligibility,
  summarizeReminders,
} from './dues-reminder-rules'
import { toDueEntry } from './treasurer-dues-rules'

const DAY = 24 * 60 * 60 * 1000
const now = new Date('2026-10-14T12:00:00.000Z')
const ago = (ms: number) => new Date(now.getTime() - ms).toISOString()

describe('REMINDER_COOLDOWN_DAYS', () => {
  it('is 7, mirrored by c_cooldown in send_dues_reminders()', () => {
    expect(REMINDER_COOLDOWN_DAYS).toBe(7)
  })
})

// Same cases as the SQL function (AC-TR-30): settled, partial, unpaid,
// undefined amount, season tariff fallback.
describe('reminderEligibility', () => {
  it.each(['unpaid', 'partial'] as const)('is eligible when %s and never reminded', (status) => {
    expect(reminderEligibility({ status }, null, now)).toBe('eligible')
  })

  it.each(['paid', 'undefined'] as const)('has no balance when %s, even if never reminded', (status) => {
    expect(reminderEligibility({ status }, null, now)).toBe('no_balance')
  })

  it('reports no balance before cooldown when settled and recently reminded', () => {
    expect(reminderEligibility({ status: 'paid' }, ago(DAY), now)).toBe('no_balance')
  })

  it('is in cooldown when reminded one day ago', () => {
    expect(reminderEligibility({ status: 'partial' }, ago(DAY), now)).toBe('cooldown')
  })

  it('is still in cooldown one millisecond before 7 days', () => {
    expect(reminderEligibility({ status: 'unpaid' }, ago(7 * DAY - 1), now)).toBe('cooldown')
  })

  it('is eligible again at exactly 7 days (sent_at > now - 7 days is strict)', () => {
    expect(reminderEligibility({ status: 'unpaid' }, ago(7 * DAY), now)).toBe('eligible')
  })

  it('is eligible after 9 days', () => {
    expect(reminderEligibility({ status: 'unpaid' }, ago(9 * DAY), now)).toBe('eligible')
  })

  it('treats a reminder timestamp equal to now as cooldown', () => {
    expect(reminderEligibility({ status: 'unpaid' }, now.toISOString(), now)).toBe('cooldown')
  })
})

describe('isReminderEligible / summarizeReminders', () => {
  function entry(id: string, paidCents: number, amountDueCents: number | null, lastRemindedAt: string | null, count = 0) {
    const due: TreasurerDue = {
      membershipId: id,
      memberName: id,
      amountDueCents,
      sections: [],
      payments: paidCents > 0 ? [{ id: `p-${id}`, amountCents: paidCents, paidAt: '2026-09-01', paymentMethod: null }] : [],
      reminder: { count, lastRemindedAt },
    }
    return toDueEntry(due, null)
  }

  const entries = [
    entry('unpaid-never', 0, 10000, null),
    entry('partial-old', 4000, 10000, ago(8 * DAY), 2),
    entry('unpaid-recent', 0, 6000, ago(2 * DAY), 1),
    entry('paid', 10000, 10000, null),
    entry('undefined', 0, null, null),
  ]

  it('flags each entry from its own status and last reminder', () => {
    expect(entries.map((e) => isReminderEligible(e, now))).toEqual([true, true, false, false, false])
  })

  it('counts n (remaining > 0), the remaining total and m (eligible)', () => {
    expect(summarizeReminders(entries, now)).toEqual({ outstandingCount: 3, remainingCents: 10000 + 6000 + 6000, eligibleCount: 2 })
  })

  it('has m = 0 when every unsettled membership is in cooldown', () => {
    expect(summarizeReminders([entries[2]], now).eligibleCount).toBe(0)
  })

  it('uses the season tariff fallback for an entry without own amount (via toDueEntry)', () => {
    const fallback = toDueEntry(
      { membershipId: 'f', memberName: 'f', amountDueCents: null, sections: [], payments: [], reminder: { count: 0, lastRemindedAt: null } },
      80,
    )
    expect(isReminderEligible(fallback, now)).toBe(true)
  })
})

describe('nextReminderAt', () => {
  it('is exactly 7 days after the last reminder', () => {
    expect(nextReminderAt('2026-10-07T08:00:00.000Z')).toBe('2026-10-14T08:00:00.000Z')
  })
})

describe('calendarDaysSince', () => {
  const localNow = new Date(2026, 9, 14, 10, 0)

  it('is 0 for the same local day', () => {
    expect(calendarDaysSince(new Date(2026, 9, 14, 0, 5).toISOString(), localNow)).toBe(0)
  })

  it('is 1 for 23:00 the evening before', () => {
    expect(calendarDaysSince(new Date(2026, 9, 13, 23, 0).toISOString(), localNow)).toBe(1)
  })

  it('counts days across a month boundary', () => {
    expect(calendarDaysSince(new Date(2026, 8, 30, 12, 0).toISOString(), localNow)).toBe(14)
  })

  it('never goes negative for a future timestamp', () => {
    expect(calendarDaysSince(new Date(2026, 9, 20, 12, 0).toISOString(), localNow)).toBe(0)
  })
})

describe('isDuesAlertVisible', () => {
  const base = {
    notification: { readAt: null as string | null },
    membership: { seasonId: 'season-1' } as { seasonId: string } | null,
    currentSeasonId: 'season-1',
    remainingCents: 6000,
  }

  it('is visible when unread, live, current season and a balance remains (partial or unpaid)', () => {
    expect(isDuesAlertVisible(base)).toBe(true)
  })

  it('is hidden once read', () => {
    expect(isDuesAlertVisible({ ...base, notification: { readAt: '2026-10-14T09:00:00.000Z' } })).toBe(false)
  })

  it('is hidden when settled, without any write on the notification (remaining 0)', () => {
    expect(isDuesAlertVisible({ ...base, remainingCents: 0 })).toBe(false)
  })

  it('is hidden when the membership is absent or archived (null)', () => {
    expect(isDuesAlertVisible({ ...base, membership: null })).toBe(false)
  })

  it('is hidden for a membership of another season', () => {
    expect(isDuesAlertVisible({ ...base, membership: { seasonId: 'season-0' } })).toBe(false)
  })

  it('is visible for the smallest positive remaining amount', () => {
    expect(isDuesAlertVisible({ ...base, remainingCents: 1 })).toBe(true)
  })
})
