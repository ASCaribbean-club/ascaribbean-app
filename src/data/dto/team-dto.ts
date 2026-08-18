// Raw shape of public.teams, see supabase/migrations/20260811171754_initial_schema.sql.
export interface TeamRow {
  id: string
  name: string
  section_id: string
  season_id: string
}
