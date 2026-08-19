import type { Season } from '../entities/season'

export interface SeasonRepository {
  // Resolves the season whose date range contains today, per Postgres'
  // current_season() function — never computed from a client-supplied date.
  // Returns null during a gap between two seasons (e.g. summer break before
  // the next season is created); callers must treat that as a valid state.
  findCurrent(): Promise<Season | null>
}
