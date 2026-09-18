// Raw shape of a public.seasons row — see
// supabase/migrations/{20260811171754_initial_schema,20260819153918_season_scoping_correction}.sql.
// Used both for the row current_season() returns (SeasonRepositoryImpl.findCurrent)
// and for a plain SELECT on the table itself (findAll, specs/web-seasons.md
// §2.6) — same column set either way. season_range (the GENERATED ALWAYS
// STORED column) is deliberately absent here: this app never selects it,
// never mind writes it (AC-WS-15). cotisation_amount (AC-WS-33, amendement
// du 2026-09-17 (2)) is the one column this app's second write pass adds on
// top of that original set — a Postgres `numeric` column, deliberately not
// integer cents (a developer call, not the spec's own AC-WS-33 wording);
// PostgREST serializes it as a plain JSON number, which is exact at
// currency-scale precision.
export interface SeasonRow {
  id: string
  label: string
  start_date: string
  end_date: string
  cotisation_amount: number | null
}

// specs/web-seasons.md §2.6/AC-WS-15 — insert payload for
// SeasonRepositoryImpl.create(). No `id` (DB default gen_random_uuid()), and
// NEVER season_range — sending it makes the insert fail (it's a GENERATED
// ALWAYS STORED column). cotisation_amount (AC-WS-34) added by the
// amendement du 2026-09-17 (2), optional at the domain boundary.
export interface SeasonInsertRow {
  label: string
  start_date: string
  end_date: string
  cotisation_amount: number | null
}

// Update payload for SeasonRepositoryImpl.update() — same columns, same
// season_range exclusion. No `id` here either: the row is targeted via
// `.eq('id', id)`, not through the payload.
export interface SeasonUpdateRow {
  label: string
  start_date: string
  end_date: string
  cotisation_amount: number | null
}
