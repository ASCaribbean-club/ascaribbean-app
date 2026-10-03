import type { Section, SectionType } from '@domain/entities/section'
import type { Team } from '@domain/entities/team'

// Display data of the section tag shown next to a convocation
// (specs/mobile-dirigeant-habilite.md AC-DH-11). Always text.
export interface SectionLabelView {
  name: string
  type: SectionType | null
}

const UNKNOWN_SECTION: SectionLabelView = { name: 'Sans section', type: null }

export function toSectionLabelView(team: Team, sectionsById: Map<string, Section>): SectionLabelView {
  const section = sectionsById.get(team.sectionId)
  return section ? { name: section.name, type: section.type } : UNKNOWN_SECTION
}
