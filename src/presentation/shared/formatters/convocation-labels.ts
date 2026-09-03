import { IconClipboardList, IconRun, IconTrophy } from '@tabler/icons-react'
import type { ConvocationType } from '@domain/entities/convocation'

// "À venir" list item titles (specs/coach-dashboard.md UI design §4).
const CONVOCATION_TYPE_LABELS: Record<ConvocationType, string> = {
  training: 'Entraînement',
  meeting: 'Réunion',
  match: 'Match',
}

export function formatConvocationType(type: ConvocationType): string {
  return CONVOCATION_TYPE_LABELS[type]
}

// icon glyph per type — mirrors the mockups' 🏃/🏆/📋 pictograms with tabler
// icons (this project's icon library, components.json "iconLibrary":
// "tabler"). Shared between NextConvocationCard and ConvocationHero, which
// both need the same convocation-type → icon mapping.
const CONVOCATION_TYPE_ICONS: Record<ConvocationType, typeof IconRun> = {
  training: IconRun,
  match: IconTrophy,
  meeting: IconClipboardList,
}

export function getConvocationTypeIcon(type: ConvocationType): typeof IconRun {
  return CONVOCATION_TYPE_ICONS[type]
}
