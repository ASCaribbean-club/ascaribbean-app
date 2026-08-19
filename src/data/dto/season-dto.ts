// Raw shape of the row returned by the current_season() SQL function, see
// supabase/migrations/20260819153918_season_scoping_correction.sql.
export interface SeasonRow {
  id: string
  label: string
  start_date: string
  end_date: string
}
