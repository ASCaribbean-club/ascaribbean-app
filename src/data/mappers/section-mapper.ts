import type { Section, SectionType } from '@domain/entities/section'
import type { CreateSectionInput, UpdateSectionInput } from '@domain/repositories/section-repository'
import type { SectionInsertRow, SectionRow, SectionUpdateRow } from '@data/dto/section-dto'

export function toSection(row: SectionRow): Section {
  return {
    id: row.id,
    name: row.name,
    type: row.type as SectionType,
    createdAt: row.created_at,
  }
}

// specs/section-and-teams.md §2.7 — the reverse direction, input -> row,
// needed by SectionRepositoryImpl.create() (CLAUDE.md §4, a mapper always
// sits between DTO and entity, both directions).
export function toSectionInsertRow(input: CreateSectionInput): SectionInsertRow {
  return {
    name: input.name,
    type: input.type,
  }
}

// Same reverse mapping for SectionRepositoryImpl.update().
export function toSectionUpdateRow(input: UpdateSectionInput): SectionUpdateRow {
  return {
    name: input.name,
    type: input.type,
  }
}
