import { SECTION_TYPES, type SectionType } from '@domain/entities/section'

// specs/section-and-teams.md UI design/PO-ST-02 — "seul « Football » est
// confirmé par la maquette ; « E-sport », « Échecs », « Domino » sont des
// propositions à valider". Non-blocking position taken here so the TYPE
// column, the type filter Select and SectionFormDialog's TYPE(SPORT) Select
// have something to render — to confirm with the developer/Bureau before
// this screen is considered final (PO-ST-02), not silently settled here.
export const SECTION_TYPE_LABELS: Record<SectionType, string> = {
  football: 'Football',
  esport: 'E-sport',
  echecs: 'Échecs',
  domino: 'Domino',
}

export const SECTION_TYPE_OPTIONS = SECTION_TYPES.map((type) => ({ value: type, label: SECTION_TYPE_LABELS[type] }))
