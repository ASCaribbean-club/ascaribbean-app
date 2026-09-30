import { IconAlertTriangle } from '@tabler/icons-react'
import { Badge } from './ui/badge'

interface AttendanceConfirmationAlertProps {
  visible: boolean
}

// Développeuse, 2026-09-30 — the "opposite" of StatusBadge's old "Clôturée"
// pill: instead of confirming a convocation is DONE (attendance fully
// confirmed, nothing to do), this flags the exception a coach actually
// needs to act on — a PAST convocation still `open`, meaning
// attendance_records_close_convocation (the DB trigger that flips status to
// 'closed') never fired because at least one player's attendance was never
// confirmed. `visible` is computed by the caller (isPastDate + status ===
// 'open' + coach role, same shape as MissingDocumentAlert's own `visible`
// prop) — this component only renders or doesn't, no business logic here.
// Amber, not red: this isn't an error, just an unfinished routine task
// (same register as ResponderStatusBadge's binary "en attente" amber).
// Icon is always doubled by its text label (AC-MD-22/AC-CA-17 — color/icon
// alone never carries the meaning).
export function AttendanceConfirmationAlert({ visible }: AttendanceConfirmationAlertProps) {
  if (!visible) return null

  return (
    <Badge className="flex items-center gap-1 rounded-full border border-coach-amber/35 bg-coach-amber/15 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-coach-amber uppercase">
      <IconAlertTriangle className="size-3.5" aria-hidden />
      Présences à confirmer
    </Badge>
  )
}
