import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchEvent } from '@domain/entities/match-event'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import type { MatchEventRow } from '@data/dto/match-event-dto'
import { toMatchEvent, toMatchEventInsertRow } from '@data/mappers/match-event-mapper'
import { mapSupabaseError } from '@data/errors/map-supabase-error'

const MATCH_EVENT_COLUMNS = 'id, convocation_id, user_id, event_type, is_penalty, created_by, created_at'

// `public.match_events` —
// supabase/migrations/20260924100000_match_statistics_schema.sql. Append-
// only log: `add`/`delete`, no `update` (MS-11, mirrors there being no
// UPDATE RLS policy at all on this table).
export class MatchEventRepositoryImpl implements MatchEventRepository {
  constructor(private readonly client: SupabaseClient) {}

  async add(event: Omit<MatchEvent, 'id' | 'createdAt'>): Promise<MatchEvent> {
    const { data, error } = await this.client
      .from('match_events')
      .insert(toMatchEventInsertRow(event))
      .select(MATCH_EVENT_COLUMNS)
      .single()

    if (error) throw mapSupabaseError(error)

    return toMatchEvent(data as MatchEventRow)
  }

  async delete(eventId: string): Promise<void> {
    const { error } = await this.client.from('match_events').delete().eq('id', eventId)

    if (error) throw mapSupabaseError(error)
  }

  async findByConvocation(convocationId: string): Promise<MatchEvent[]> {
    const { data, error } = await this.client
      .from('match_events')
      .select(MATCH_EVENT_COLUMNS)
      .eq('convocation_id', convocationId)
      .order('created_at', { ascending: true })

    if (error) throw mapSupabaseError(error)

    return (data as MatchEventRow[]).map(toMatchEvent)
  }
}
