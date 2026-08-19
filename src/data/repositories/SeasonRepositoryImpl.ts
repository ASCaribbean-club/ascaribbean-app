import type { SupabaseClient } from '@supabase/supabase-js'
import type { Season } from '@domain/entities/season'
import type { SeasonRepository } from '@domain/repositories/season-repository'
import type { SeasonRow } from '../dto/season-dto'
import { mapSupabaseError } from '../errors/map-supabase-error'
import { toSeason } from '../mappers/season-mapper'

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
}
