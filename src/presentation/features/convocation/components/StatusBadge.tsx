import type { ConvocationStatus } from '@domain/entities/convocation'
import { Badge } from '@presentation/shared/components/ui/badge'

interface StatusBadgeProps {
  status: ConvocationStatus
}

// specs/match_details_page.md UI design, "Corrections obligatoires vs
// maquette" #1: the mockup's "CONVOQUÉE" pastille doesn't correspond to any
// domain field (ConvocationStatus is 'open' | 'closed' | 'cancelled', and
// there's no notion of "convoked" at the screen level) — this replaces it
// with the REAL status, in the same top-right slot of the hero.
//
// Développeuse, 2026-09-30 — AC-MD-05/AC-CA-16 override (see specs/
// match_details_page.md and specs/calendar.md's own dated notes): 'closed'
// no longer renders "Clôturée" here. A closed convocation just means
// attendance-taking finished normally (the attendance_records_close_
// convocation trigger) — not worth an exception badge. The genuinely
// actionable signal is the OPPOSITE: a past convocation still `open`,
// meaning attendance was never confirmed — that's
// `AttendanceConfirmationAlert` (presentation/shared/components/), a
// separate coach-only component, not a third state of this badge.
// 'cancelled' remains the only real exception this badge exists to
// surface, always doubled by its text label (AC-MD-22/AC-CA-17).
export function StatusBadge({ status }: StatusBadgeProps) {
  if (status !== 'cancelled') return

  return (
    <Badge className="rounded-full border border-coach-red/35 bg-coach-red/15 px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide text-coach-red-text uppercase">
      Annulée
    </Badge>
  )
}
