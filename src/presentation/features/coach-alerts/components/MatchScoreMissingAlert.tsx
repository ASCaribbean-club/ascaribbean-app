import { IconAlertTriangle } from '@tabler/icons-react'
import { Badge } from '@presentation/shared/components/ui/badge'

interface MatchScoreMissingAlertProps {
  visible: boolean
}

// specs/coach-alerts.md UI design "Composant nouveau" #1 — signal B's chip,
// a sibling of AttendanceConfirmationAlert (reused as-is for signal A,
// unmodified), same amber token/icon/shape registry, not a new palette:
// same `border-coach-amber/35 bg-coach-amber/15 text-coach-amber` tokens,
// same `IconAlertTriangle`, always doubled by a text label (AC-AL-17 — color
// alone never carries the meaning). Fixed label, no variable data — the
// score itself is never shown here (AC-AL-03: this screen never duplicates
// ConvocationDetailPage's own score content).
export function MatchScoreMissingAlert({ visible }: MatchScoreMissingAlertProps) {
  if (!visible) return null

  return (
    <Badge className="flex items-center gap-1 rounded-full border border-coach-amber/35 bg-coach-amber/15 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-coach-amber uppercase">
      <IconAlertTriangle className="size-3.5" aria-hidden />
      Score manquant
    </Badge>
  )
}
