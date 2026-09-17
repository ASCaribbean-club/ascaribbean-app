// Raw shape of a public.seasons row — see
// supabase/migrations/{20260811171754_initial_schema,20260819153918_season_scoping_correction}.sql.
// Used both for the row current_season() returns (SeasonRepositoryImpl.findCurrent)
// and for a plain SELECT on the table itself (findAll, specs/web-seasons.md
// §2.6) — same column set either way. season_range (the GENERATED ALWAYS
// STORED column) is deliberately absent here: this app never selects it,
// never mind writes it (AC-WS-15).
export interface SeasonRow {
  id: string
  label: string
  start_date: string
  end_date: string
}

// specs/web-seasons.md §2.6/AC-WS-15 — insert payload for
// SeasonRepositoryImpl.create(). No `id` (DB default gen_random_uuid()), and
// NEVER season_range — sending it makes the insert fail (it's a GENERATED
// ALWAYS STORED column).
export interface SeasonInsertRow {
  label: string
  start_date: string
  end_date: string
}

// Update payload for SeasonRepositoryImpl.update() — same 3 columns, same
// season_range exclusion. No `id` here either: the row is targeted via
// `.eq('id', id)`, not through the payload.
export interface SeasonUpdateRow {
  label: string
  start_date: string
  end_date: string
}
