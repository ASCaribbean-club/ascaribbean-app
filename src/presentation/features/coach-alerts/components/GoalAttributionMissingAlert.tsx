import { IconAlertTriangle } from '@tabler/icons-react'
import { Badge } from '@presentation/shared/components/ui/badge'

interface GoalAttributionMissingAlertProps {
  visible: boolean
  attributedCount: number
  goalsFor: number | null
}

// specs/coach-alerts.md UI design "Composant nouveau" #1 — signal C's chip,
// same amber registry as MatchScoreMissingAlert/AttendanceConfirmationAlert.
// The label reuses, LITERALLY, the counter already rendered by
// MatchResultScorerPicker.tsx ("{attributedCount} / {goalsFor} buts
// attribués") rather than inventing new wording — AC-AL-09 explicitly allows
// this: a strictly event-scoped aggregate, it names no one.
export function GoalAttributionMissingAlert({ visible, attributedCount, goalsFor }: GoalAttributionMissingAlertProps) {
  if (!visible) return null

  return (
    <Badge className="flex items-center gap-1 rounded-full border border-coach-amber/35 bg-coach-amber/15 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-coach-amber uppercase">
      <IconAlertTriangle className="size-3.5" aria-hidden />
      {attributedCount} / {goalsFor ?? '—'} buts attribués
    </Badge>
  )
}
