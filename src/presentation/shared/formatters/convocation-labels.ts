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
