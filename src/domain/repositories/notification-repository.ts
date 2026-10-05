import type { Notification } from '../entities/notification'

// specs/mobile-treasurer.md amendement (4), §C/§H — member side, under the
// caller's own RLS (notifications_select_own / notifications_update_own_read):
// there is no insert here, notifications are only created by
// send_dues_reminders().
export interface NotificationRepository {
  // The caller's 'dues_reminder' notification for this membership, or null.
  findDuesReminderForMembership(membershipId: string): Promise<Notification | null>

  // Sets read_at (the only column a member may change). Hiding the banner.
  markRead(notificationId: string): Promise<void>
}
