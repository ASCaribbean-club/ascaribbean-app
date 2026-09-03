import type { ConvocationStatus } from '@domain/entities/convocation'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface StatusBadgeProps {
  status: ConvocationStatus
}

// specs/match_details_page.md UI design, "Corrections obligatoires vs
// maquette" #1: the mockup's "CONVOQUÉE" pastille doesn't correspond to any
// domain field (ConvocationStatus is 'open' | 'closed' | 'cancelled', and
// there's no notion of "convoked" at the screen level) — this replaces it
// with the REAL status, in the same top-right slot of the hero.
//
// AC-MD-05 / AC-MD-22: the status is always doubled by a text label, never
// conveyed by color alone — this component always renders both the Badge's
// background AND its text, there's no icon-only or color-only variant.
// Colors extend the vocabulary already established elsewhere in the app
// (vert positif / rouge négatif / neutre) rather than inventing a new one —
// same green/red tokens as ResponseBar and ResponseActions.
const STATUS_LABEL: Record<ConvocationStatus, string> = {
  open: 'Ouverte',
  closed: 'Clôturée',
  cancelled: 'Annulée',
}

const STATUS_CLASSNAME: Record<ConvocationStatus, string> = {
  open: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
  cancelled: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text',
  // "Clôturée" is neither a positive nor a negative outcome (a closed
  // convocation just means responses are no longer being collected) — the
  // neutral white/muted treatment, same family as ResponseBar's "en
  // attente" segment.
  closed: 'border-white/15 bg-white/10 text-white/70',
}

export function StatusBadge({ status }: StatusBadgeProps) {
  // AC-MD-05 (revised 2026-09-02): 'open' is the silent default — the badge
  // only surfaces an exception (closed/cancelled), never the active state.
  if (status === 'open') return
  return (
    <Badge className={cn('rounded-full px-2.5 py-1 text-[10.5px] font-extrabold tracking-wide uppercase', STATUS_CLASSNAME[status])}>
      {STATUS_LABEL[status]}
    </Badge>
  )
}
