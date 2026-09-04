import type { DeclaredStatus } from '@domain/entities/convocation'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface ResponseStatusPillProps {
  // The player's own declared status for a PAST/closed/cancelled
  // convocation, or `null` if they never responded (a state the 5 mockups
  // never show — UI design §"Composant nouveau" #2 — but AC-CA-17 still
  // requires a labeled, non-color-only rendering for it).
  status: DeclaredStatus | null
}

// specs/calendar.md UI design, "Composant nouveau" §2 — PO-CA-02's
// read-only pattern for a past echéance (export `_3`): a compact pill
// aligned where ResponseActions' button pair would be, replacing the
// Présent/Absent PAIR of buttons, never a third button state. Deliberately
// a new component rather than a third ResponseActions variant: that
// component's `canRespond` prop already means "show the two buttons at
// all" (AC-PD-06) — overloading it with "show a pill instead" would make
// its single boolean answer two different questions (CLAUDE.md §6 asks the
// opposite: one ViewModel-computed boolean per concern). The caller
// (useCalendarViewModel) decides which of ResponseActions / this pill to
// render per row, based on canPlayerRespond(convocation, now) — not a third
// prop threaded into ResponseActions itself.
//
// Colors reuse the exact same tokens as ResponseBar/ResponseActions
// (coach-green/coach-red) and StatusBadge's neutral treatment for the
// "no response" case — no new palette (AC-CA-17: color always doubled by a
// text label, so the label is what actually carries the meaning here).
const STATUS_LABEL: Record<'present' | 'absent' | 'none', string> = {
  present: 'Présent',
  absent: 'Absent',
  none: 'Sans réponse',
}

const STATUS_CLASSNAME: Record<'present' | 'absent' | 'none', string> = {
  present: 'border-transparent bg-coach-green text-white',
  absent: 'border-transparent bg-coach-red text-white',
  none: 'border-white/15 bg-white/10 text-white/60',
}

export function ResponseStatusPill({ status }: ResponseStatusPillProps) {
  // 'pending' is not a player-chosen value (see RespondToConvocationInput's
  // own comment) — it only exists on a ConvocationResponse row before a
  // player has acted, which for a past/closed convocation is
  // indistinguishable from "never responded" as far as this read-only pill
  // is concerned, hence folding it into the 'none' bucket below.
  const key = status === 'present' || status === 'absent' ? status : 'none'

  return (
    <Badge className={cn('shrink-0 rounded-full px-3 py-1 text-[12px] font-bold', STATUS_CLASSNAME[key])}>
      {STATUS_LABEL[key]}
    </Badge>
  )
}
