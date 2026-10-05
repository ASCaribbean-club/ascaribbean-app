import type { SupabaseClient } from '@supabase/supabase-js'
import type { DuesReminderResult } from '@domain/entities/dues-reminder'
import type { DuesReminderRepository } from '@domain/repositories/dues-reminder-repository'
import type { DuesReminderResultDto } from '../dto/dues-reminder-result-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toDuesReminderResult } from '../mappers/dues-reminder-result-mapper'

// `send_dues_reminders` — supabase/migrations/20261005170200_send_dues_reminders.sql.
// Rule name: dues:remind. The function's own treasurer check (42501
// otherwise) is the real boundary; no sender parameter exists (read from
// auth.uid() server-side). No insert is ever issued on dues_reminders or
// notifications from the client: no policy would allow it.
export class DuesReminderRepositoryImpl implements DuesReminderRepository {
  constructor(private readonly client: SupabaseClient) {}

  async send(membershipIds: string[]): Promise<DuesReminderResult[]> {
    const { data, error } = await this.client.rpc('send_dues_reminders', { p_membership_ids: membershipIds })

    if (error) throw mapSupabaseError(error)
    return ((data ?? []) as DuesReminderResultDto[]).map(toDuesReminderResult)
  }
}
