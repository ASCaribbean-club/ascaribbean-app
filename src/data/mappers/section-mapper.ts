import type { Section, SectionType } from '@domain/entities/section'
import type { SectionRow } from '@data/dto/section-dto'

export function toSection(row: SectionRow): Section {
  return {
    id: row.id,
    name: row.name,
    type: row.type as SectionType,
    createdAt: row.created_at,
  }
}
