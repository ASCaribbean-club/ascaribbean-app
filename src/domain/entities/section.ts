export type SectionType = 'football' | 'esport' | 'echecs' | 'domino'

// specs/section-and-teams.md §2.5/AC-ST-11/PO-ST-02 — the four values the
// `type` CHECK constraint on public.sections allows (mirrored manually, see
// supabase/migrations/20260811171754_initial_schema.sql). Used by
// CreateSectionUseCase/UpdateSectionUseCase to reject an out-of-range type
// from the domain, before any network call — this pass adds none of its own
// (PO-ST-02 is open on whether four sports is enough, not decided here).
export const SECTION_TYPES: SectionType[] = ['football', 'esport', 'echecs', 'domino']

export interface Section {
  id: string
  name: string
  type: SectionType
  createdAt: string
}
