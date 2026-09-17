import type { Section } from '../entities/section'

// specs/section-and-teams.md §2.7/AC-ST-12 — "Une seule interface par
// ressource, pas de BackofficeSectionRepository séparé" (same position as
// SeasonRepository/NewsRepository). findById()/findAll() are kept EXACTLY
// as they were, in both signature and behaviour: findById() backs
// GetProfileRoleScopesUseCase and useConvocationDetailViewModel's own
// section lookup, findAll() is the /admin/sections read (called directly,
// no wrapping use case — same "no use case for a plain passthrough read"
// precedent as SeasonRepository.findAll()). create()/update() are new,
// added here rather than on a second interface.
export interface SectionRepository {
  findById(id: string): Promise<Section | null>
  findAll(): Promise<Section[]>

  // CreateSectionUseCase is the only caller, never presentation/ directly
  // (AC-ST-14/AC-ST-31).
  create(input: CreateSectionInput): Promise<Section>

  // UpdateSectionUseCase is the only caller. Targets the SAME row
  // (AC-ST-24) — no "which rows are modifiable" restriction exists for a
  // section (unlike seasons_update_admin), see §2.6/PO-ST-04.
  update(id: string, input: UpdateSectionInput): Promise<Section>
}

// Mirrors the entity minus what the database always derives itself
// (id, createdAt).
export type CreateSectionInput = Omit<Section, 'id' | 'createdAt'>

// Same 2 fields as CreateSectionInput — §2.1: sections carries no
// updated_at/updated_by column to also touch (PO-ST-03).
export type UpdateSectionInput = Omit<Section, 'id' | 'createdAt'>
