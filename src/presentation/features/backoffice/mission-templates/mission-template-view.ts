import type { ConvocationType } from '@domain/entities/convocation'
import type { MissionTemplate } from '@domain/entities/mission-template'

export const MISSION_TYPE_TABS: { type: ConvocationType; label: string }[] = [
  { type: 'training', label: 'Entraînement' },
  { type: 'match', label: 'Match' },
  { type: 'meeting', label: 'Réunion' },
]

export const MISSION_CAPACITY_CHOICES = [1, 2, 3] as const

export function missionTypeLabel(type: ConvocationType): string {
  return MISSION_TYPE_TABS.find((tab) => tab.type === type)?.label ?? type
}

export function formatMissionCapacity(capacity: number): string {
  return capacity === 1 ? '1 personne' : `${capacity} personnes`
}

// PO-MT-03 default: the requested type only, active first, then inactive;
// within each group the repository's creation order is kept (the sort is
// stable and does not reorder inside a group).
export function selectMissionRows(templates: MissionTemplate[], type: ConvocationType): MissionTemplate[] {
  const ofType = templates.filter((template) => template.convocationType === type)
  return [...ofType.filter((template) => template.isActive), ...ofType.filter((template) => !template.isActive)]
}

// The table renders a second line only when this returns a string.
export function missionDescriptionToShow(description: string | null): string | null {
  const trimmed = description?.trim() ?? ''
  return trimmed === '' ? null : trimmed
}
