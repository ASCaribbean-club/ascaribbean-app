import type { SupabaseClient } from '@supabase/supabase-js'
import type { Notification } from '@domain/entities/notification'
import type { NotificationRepository } from '@domain/repositories/notification-repository'
import type { NotificationRow } from '../dto/notification-row'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toNotification } from '../mappers/notification-mapper'

const NOTIFICATION_COLUMNS = 'id, recipient_id, kind, membership_id, sent_at, read_at'

// Both methods run under the caller's own RLS: notifications_select_own
// (read) and notifications_update_own_read (+ column grant on read_at only) —
// see supabase/migrations/20261005170000_dues_reminders_schema.sql. RLS-only,
// no matrix entry (the screen renders what is returned).
export class NotificationRepositoryImpl implements NotificationRepository {
  constructor(private readonly client: SupabaseClient) {}

  // maybeSingle(): at most one row per (recipient, kind, membership) — the
  // unique constraint — and zero rows is the normal "never reminded" state.
  async findDuesReminderForMembership(membershipId: string): Promise<Notification | null> {
    const { data, error } = await this.client
      .from('notifications')
      .select(NOTIFICATION_COLUMNS)
      .eq('kind', 'dues_reminder')
      .eq('membership_id', membershipId)
      .maybeSingle<NotificationRow>()

    if (error) throw mapSupabaseError(error)
    return data ? toNotification(data) : null
  }

  async markRead(notificationId: string): Promise<void> {
    const { error } = await this.client
      .from('notifications')
      .update({ read_at: new Date().toISOString() })
      .eq('id', notificationId)

    if (error) throw mapSupabaseError(error)
  }
}
