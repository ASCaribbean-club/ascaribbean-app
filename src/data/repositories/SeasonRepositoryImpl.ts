import type { SupabaseClient } from '@supabase/supabase-js'
import type { Season } from '@domain/entities/season'
import type { CreateSeasonInput, SeasonRepository, UpdateSeasonInput } from '@domain/repositories/season-repository'
import type { SeasonRow } from '../dto/season-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toSeason, toSeasonInsertRow, toSeasonUpdateRow } from '../mappers/season-mapper'

const SEASON_COLUMNS = 'id, label, start_date, end_date'

export class SeasonRepositoryImpl implements SeasonRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  // current_season() resolves "now" in Postgres, never from a client-supplied
  // date. It is declared to return a single seasons row (not SETOF), so
  // PostgREST returns the row directly or JSON null — never an array.
  // maybeSingle() (not single()): a gap between two seasons is a valid,
  // expected zero-row state, not an error to throw on.
  async findCurrent(): Promise<Season | null> {
    const { data, error } = await this.client.rpc('current_season').maybeSingle()

    if (error) throw mapSupabaseError(error)
    return data ? toSeason(data as SeasonRow) : null
  }

  // specs/web-seasons.md §2.6/AC-WS-13 — admin list, every row. No extra
  // filter written here: seasons_select_authenticated (RLS) already returns
  // every row to every authenticated caller, admin included — unlike
  // club_news, there is no separate admin-only read policy to rely on
  // (§2.5). PO-WS-09 (non-blocking) — reverse-chronological by start_date,
  // most recent season first, the spec's own stated fallback in the absence
  // of a confirmed ordering.
  async findAll(): Promise<Season[]> {
    const { data, error } = await this.client
      .from('seasons')
      .select(SEASON_COLUMNS)
      .order('start_date', { ascending: false })
      .overrideTypes<SeasonRow[]>()

    if (error) throw mapSupabaseError(error)
    return (data ?? []).map(toSeason)
  }

  // seasons_insert_admin (RLS). AC-WS-15 — season_range is never part of
  // this payload: it's a GENERATED ALWAYS STORED column, toSeasonInsertRow
  // doesn't even have a field for it.
  async create(input: CreateSeasonInput): Promise<Season> {
    const { data, error } = await this.client
      .from('seasons')
      .insert(toSeasonInsertRow(input))
      .select(SEASON_COLUMNS)
      .single()
      .overrideTypes<SeasonRow>()

    if (error) throw mapSupabaseError(error)
    return toSeason(data)
  }

  // seasons_update_admin (RLS) — enforces "not already ended" via its own
  // `using`/`with check` clauses (§2.5); this repository doesn't pre-filter
  // by row state, a rejected write surfaces as a mapped 42501.
  async update(id: string, input: UpdateSeasonInput): Promise<Season> {
    const { data, error } = await this.client
      .from('seasons')
      .update(toSeasonUpdateRow(input))
      .eq('id', id)
      .select(SEASON_COLUMNS)
      .single()
      .overrideTypes<SeasonRow>()

    if (error) throw mapSupabaseError(error)
    return toSeason(data)
  }
}
