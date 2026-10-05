// specs/mobile-treasurer.md amendement (4), §C — minimal notification
// foundation, bounded to ONE kind. Current-state row (one per recipient,
// kind and membership; a new reminder re-arms it), distinct from the
// append-only public.dues_reminders history (same split as
// ConvocationResponse / AttendanceRecord, CLAUDE.md §6).
//
// Carries no amount, no text and no sender name: what the member reads is
// derived live from their own membership and payments. No expiry logic here
// either (purge belongs to the Supabase scheduled job, CLAUDE.md §6).
export type NotificationKind = 'dues_reminder'

export interface Notification {
  id: string
  recipientId: string
  kind: NotificationKind
  // Set for 'dues_reminder'.
  membershipId: string | null
  // ISO timestamp of the latest reminder.
  sentAt: string
  // null = unread = the alert is shown (when still relevant).
  readAt: string | null
}
