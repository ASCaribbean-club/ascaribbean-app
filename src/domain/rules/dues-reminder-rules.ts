// Pure rules of the dues reminders — specs/mobile-treasurer.md amendement (4),
// §B: "what's true", never "who's allowed" ('dues:remind' covers that). The
// remaining amount is never recomputed here: it comes from
// membershipPaymentStatus()/remainingDueCents() (membership-payment-rules.ts),
// the single TypeScript implementation (AC-TR-06).
import type { Notification } from '../entities/notification'
import type { Membership } from '../entities/membership'
import type { MembershipPaymentStatus } from './membership-payment-rules'
import type { TreasurerDueEntry } from './treasurer-dues-rules'

// Anti-spam window, in days, sliding per membership (PO-TR-13, default).
// HAND-MIRRORED in SQL by send_dues_reminders()
// (supabase/migrations/20261005170200_send_dues_reminders.sql, constant
// `c_cooldown`, `sent_at > now() - c_cooldown`): change both together
// (CLAUDE.md §7).
export const REMINDER_COOLDOWN_DAYS = 7

// Upper bound of memberships per call. Hand-mirrored by the same SQL function
// (`c_max_batch`): change both together.
export const MAX_REMINDER_BATCH_SIZE = 100

const MS_PER_DAY = 24 * 60 * 60 * 1000

export type ReminderEligibility = 'eligible' | 'no_balance' | 'cooldown'

// The rule the server reapplies (AC-TR-30): same cases, same order.
//  - 'no_balance': settled ('paid') or amount due undefined — nothing owed.
//  - 'cooldown': a reminder was sent strictly less than 7 days ago
//    (`sent_at > now - 7 days`, so exactly 7 days ago is eligible again).
export function reminderEligibility(
  due: { status: MembershipPaymentStatus },
  lastRemindedAt: string | null,
  now: Date,
): ReminderEligibility {
  if (due.status === 'paid' || due.status === 'undefined') return 'no_balance'
  if (lastRemindedAt !== null && Date.parse(lastRemindedAt) > now.getTime() - REMINDER_COOLDOWN_DAYS * MS_PER_DAY) {
    return 'cooldown'
  }
  return 'eligible'
}

export function isReminderEligible(entry: Pick<TreasurerDueEntry, 'status' | 'reminder'>, now: Date): boolean {
  return reminderEligibility(entry, entry.reminder.lastRemindedAt, now) === 'eligible'
}

// First instant a new reminder is allowed again (ISO timestamp).
export function nextReminderAt(lastRemindedAt: string): string {
  return new Date(Date.parse(lastRemindedAt) + REMINDER_COOLDOWN_DAYS * MS_PER_DAY).toISOString()
}

// Whole calendar days between two instants, in the device's LOCAL time
// (specs §B "Libellé d'état"): 0 = today, 1 = yesterday. Compared as local
// dates, not as 24 h spans, so a reminder sent at 23:00 reads "hier" the next
// morning. Never negative.
export function calendarDaysSince(isoTimestamp: string, now: Date): number {
  const then = new Date(isoTimestamp)
  const thenDay = Date.UTC(then.getFullYear(), then.getMonth(), then.getDate())
  const nowDay = Date.UTC(now.getFullYear(), now.getMonth(), now.getDate())
  return Math.max(0, Math.round((nowDay - thenDay) / MS_PER_DAY))
}

// "Reste dû > 0" entries only — the n of the banner; m = the eligible ones.
export function summarizeReminders(
  entries: TreasurerDueEntry[],
  now: Date,
): { outstandingCount: number; remainingCents: number; eligibleCount: number } {
  const outstanding = entries.filter((entry) => entry.remainingCents > 0)
  return {
    outstandingCount: outstanding.length,
    remainingCents: outstanding.reduce((total, entry) => total + entry.remainingCents, 0),
    eligibleCount: outstanding.filter((entry) => isReminderEligible(entry, now)).length,
  }
}

// "Alerte du membre" visibility (§B). True iff ALL of:
//  1. the notification is unread;
//  2. it concerns a live membership of the CURRENT season (`membership` is
//     null when absent or archived — the repository read already excludes
//     archived rows);
//  3. that membership still has a remaining amount > 0, read at display time.
// Resolution on payment is DERIVED here, never written (AC-TR-41).
export function isDuesAlertVisible(input: {
  notification: Pick<Notification, 'readAt'>
  membership: Pick<Membership, 'seasonId'> | null
  currentSeasonId: string
  remainingCents: number
}): boolean {
  if (input.notification.readAt !== null) return false
  if (input.membership === null) return false
  if (input.membership.seasonId !== input.currentSeasonId) return false
  return input.remainingCents > 0
}
