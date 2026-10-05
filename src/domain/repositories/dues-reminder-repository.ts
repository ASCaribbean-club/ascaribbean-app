import type { DuesReminderResult } from '../entities/dues-reminder'

// Backed by the security-definer send_dues_reminders(uuid[]) function
// (supabase/migrations/20261005170200_send_dues_reminders.sql) — the only write
// path of public.dues_reminders and of the reminder side of
// public.notifications. The function is the real boundary: it checks the
// treasurer role ('dues:remind', 42501 otherwise), reapplies the eligibility
// rule and the 7-day window, and is atomic per call. The sender is never a
// parameter: the function reads it from the session.
export interface DuesReminderRepository {
  // One result per DISTINCT id received, in the same call.
  send(membershipIds: string[]): Promise<DuesReminderResult[]>
}
