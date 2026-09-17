// Raw shape of public.teams, see supabase/migrations/20260811171754_initial_schema.sql
// and supabase/migrations/20260917140000_section_team_write_policies.sql
// (section_id/season_id are `not null` as of that migration, AC-ST-05).
export interface TeamRow {
  id: string
  name: string
  section_id: string
  season_id: string
}

// specs/section-and-teams.md §2.7 — insert payload for
// TeamRepositoryImpl.create(). No `id` (DB default).
export interface TeamInsertRow {
  name: string
  section_id: string
  season_id: string
}

// Update payload for TeamRepositoryImpl.update() — same 3 columns. No `id`
// here either: the row is targeted via `.eq('id', id)`.
export interface TeamUpdateRow {
  name: string
  section_id: string
  season_id: string
}
