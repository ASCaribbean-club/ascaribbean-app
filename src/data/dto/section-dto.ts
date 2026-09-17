// Raw shape of public.sections, see supabase/migrations/20260811171754_initial_schema.sql.
export interface SectionRow {
  id: string
  name: string
  type: string
  created_at: string
}

// specs/section-and-teams.md §2.7 — insert payload for
// SectionRepositoryImpl.create(). No `id`/`created_at` (DB defaults).
export interface SectionInsertRow {
  name: string
  type: string
}

// Update payload for SectionRepositoryImpl.update() — same 2 columns. No
// `id` here either: the row is targeted via `.eq('id', id)`.
export interface SectionUpdateRow {
  name: string
  type: string
}
