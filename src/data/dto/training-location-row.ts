// Raw shape of public.training_locations — see
// supabase/migrations/20261001100000_web_localizations.sql
// (specs/web-localizations.md §2.1).
export interface TrainingLocationRow {
  id: string
  name: string
  address: string
  is_archived: boolean
  created_at: string
}

// The columns embedded in a convocations read through the FK
// (`training_location:training_locations(id, name, address, is_archived)`,
// specs/web-localizations.md §2.6) — a subset of the row, not a second table.
export type TrainingLocationEmbedRow = Pick<TrainingLocationRow, 'id' | 'name' | 'address' | 'is_archived'>

// Insert/update payload — never id/created_at (DB defaults) and never
// is_archived: archiving is its own narrow write (TrainingLocationArchiveUpdateRow).
export interface TrainingLocationWriteRow {
  name: string
  address: string
}

// The archive write — exactly one column, so a bug can't flip anything else.
export interface TrainingLocationArchiveUpdateRow {
  is_archived: true
}
