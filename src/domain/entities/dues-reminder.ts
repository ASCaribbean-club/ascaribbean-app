// specs/mobile-treasurer.md amendement (4), §B/§C — what the Treasurer sees of
// a membership's reminder history (read from get_treasurer_dues()). Never the
// sender, never a message: the history row lives in public.dues_reminders
// (append-only), this is only its aggregate.
export interface DuesReminderState {
  count: number
  // ISO timestamp of the most recent reminder; null when never reminded.
  lastRemindedAt: string | null
}

// Per-membership result of one call to send_dues_reminders(). Mirrors the
// function's `outcome` column — change both together (CLAUDE.md §7).
// 'not_found' also covers an archived membership or one outside the current
// season: from the Treasurer's read model they do not exist.
export const DUES_REMINDER_OUTCOMES = ['sent', 'no_balance', 'cooldown', 'not_found'] as const

export type DuesReminderOutcome = (typeof DUES_REMINDER_OUTCOMES)[number]

export function isDuesReminderOutcome(value: unknown): value is DuesReminderOutcome {
  return typeof value === 'string' && (DUES_REMINDER_OUTCOMES as readonly string[]).includes(value)
}

export interface DuesReminderResult {
  membershipId: string
  outcome: DuesReminderOutcome
}
