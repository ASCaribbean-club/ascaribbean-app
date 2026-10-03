import type { SectionType } from '@domain/entities/section'

// Display mapping only (specs/mobile-dirigeant-habilite.md UI design §0,
// Q-UI-01): the tint of a section label by section type. A type without an
// entry (echecs, domino, any future section) falls back to the neutral
// white/70. The label is ALWAYS text, never a colour alone (AC-DH-11).
const SECTION_TYPE_TINT: Partial<Record<SectionType, string>> = {
  football: 'text-coach-red-text',
  esport: 'text-coach-green-text',
}

const NEUTRAL_TINT = 'text-white/70'

export function getSectionTint(type: SectionType | null): string {
  return (type && SECTION_TYPE_TINT[type]) || NEUTRAL_TINT
}
