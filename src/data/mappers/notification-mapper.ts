import type { Notification, NotificationKind } from '@domain/entities/notification'
import type { NotificationRow } from '../dto/notification-row'

const NOTIFICATION_KINDS: readonly string[] = ['dues_reminder'] satisfies NotificationKind[]

// Returns null for a kind this client does not know (a later notification type
// read by an older bundle): the row is skipped, never mis-rendered.
export function toNotification(row: NotificationRow): Notification | null {
  if (!NOTIFICATION_KINDS.includes(row.kind)) return null
  return {
    id: row.id,
    recipientId: row.recipient_id,
    kind: row.kind as NotificationKind,
    membershipId: row.membership_id,
    sentAt: row.sent_at,
    readAt: row.read_at,
  }
}
