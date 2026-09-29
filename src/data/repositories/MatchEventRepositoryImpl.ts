import type { SupabaseClient } from '@supabase/supabase-js'
import type { CardsSummary } from '@domain/entities/cards-summary'
import type { MatchEvent } from '@domain/entities/match-event'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import type { CardsSummaryDto } from '@data/dto/cards-summary-dto'
import type { MatchEventRow } from '@data/dto/match-event-dto'
import { toCardsSummary } from '@data/mappers/cards-summary-mapper'
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

  // specs/player-stats.md §1/AC-PS-03/AC-PS-02 — get_my_goals_count(),
  // SECURITY INVOKER (supabase/migrations/20260928120000_player_stats_summary_rpcs.sql).
  // Returns a bare integer, not a named-column row — no DTO/mapper here
  // (CLAUDE.md §4's DTO convention is for a shape with fields to translate;
  // there is nothing to map field-by-field on a scalar), same "raw number
  // in/out" shape as MembershipRepositoryImpl.countPendingForSeason. No
  // parameter: filters on auth.uid() internally (AC-02).
  async getOwnGoalsCountForCurrentSeason(): Promise<number> {
    const { data, error } = await this.client.rpc('get_my_goals_count')

    if (error) throw mapSupabaseError(error)

    return (data as number) ?? 0
  }

  // specs/player-stats.md addendum "PO-PS-03 tranché" — get_my_cards_count(),
  // SECURITY INVOKER (supabase/migrations/
  // 20260929112002_player_stats_own_cards_rls.sql) — the new own-row branch
  // of match_events_select_scoped is what makes SECURITY INVOKER safe here
  // (no elevated privilege needed, same shape as getOwnGoalsCountForCurrentSeason
  // above). `single()` is safe — no GROUP BY, always exactly one row.
  async getOwnCardsCountForCurrentSeason(): Promise<CardsSummary> {
    const { data, error } = await this.client.rpc('get_my_cards_count').single<CardsSummaryDto>()

    if (error) throw mapSupabaseError(error)

    return toCardsSummary(data as CardsSummaryDto)
  }
}
