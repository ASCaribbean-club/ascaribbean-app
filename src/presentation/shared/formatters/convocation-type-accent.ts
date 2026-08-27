import type { ConvocationType } from '@domain/entities/convocation'

// Rail/badge accent colors for a convocation type. Extracted out of
// coach-dashboard's UpcomingList so player-dashboard's
// UpcomingConvocationList can reuse the exact same mapping rather than
// redefining it — specs/player-dashboard.md UI design §"Composants
// réutilisés vs nouveau": "même code couleur que côté coach, à réutiliser
// tel quel plutôt qu'en redéfinir un". Display mapping only, not a
// business rule — a formatter, not domain/rules/.
export const CONVOCATION_TYPE_ACCENT: Record<ConvocationType, { rail: string; badge: string }> = {
  training: { rail: 'bg-coach-green', badge: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text' },
  meeting: { rail: 'bg-coach-amber', badge: 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber' },
  match: { rail: 'bg-coach-red', badge: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text' },
}
