import type { DeclaredStatus } from '@domain/entities/convocation'
import { Badge } from '../../../shared/components/ui/badge'
import { cn } from '../../../shared/lib/utils'

// Discriminated union, not two optional props — a roster row is either
// rendered for the player view (binary) or the coach view (tri-state),
// never both at once (specs/match_details_page.md §2, "un bloc non
// autorisé est absent"). Modeling it this way makes the two variants
// mutually exclusive at the type level instead of relying on the caller to
// never pass `status` and `hasResponded` together.
type ResponderStatusBadgeProps =
  | { variant: 'binary'; hasResponded: boolean }
  | { variant: 'tri-state'; status: DeclaredStatus }

// UI design §"Corrections obligatoires vs maquette" #9 — the mockup's
// "a répondu" badge was GREEN, which this project already uses for
// "présent" everywhere else (ResponseBar, ResponseActions). §6 forbids that
// explicitly for the player-facing badge: "éviter le couple vert/rouge...
// un badge vert lirait présent". Revised 2026-09-01 (décision développeuse):
// amber (`coach-amber`, already used for the "meeting" convocation accent)
// instead of the fully neutral white/gray originally shipped — visually
// distinct from "en attente" without reusing vert/rouge, so the §6 rule
// still holds while being closer to the mockup's intent of a visible
// affirmative state.
//
// The tri-state variant is the opposite case: reusing green/red/muted here
// IS legitimate, because it's rendered only for the coach, who has the
// right to see the real status (§2) — same palette ResponseBar already uses
// for the aggregate directly above this list in EffectifTab.
export function ResponderStatusBadge(props: ResponderStatusBadgeProps) {
  if (props.variant === 'binary') {
    return (
      <Badge
        className={cn(
          'rounded-full border px-2.5 py-1 text-[11px] font-bold',
          props.hasResponded ? 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber' : 'border-white/12 bg-white/8 text-white/60',
        )}
      >
        {props.hasResponded ? 'A répondu' : 'En attente'}
      </Badge>
    )
  }

  const TRI_STATE_LABEL: Record<DeclaredStatus, string> = {
    present: 'Présent',
    absent: 'Absent',
    pending: 'En attente',
  }
  const TRI_STATE_CLASSNAME: Record<DeclaredStatus, string> = {
    present: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
    absent: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text',
    pending: 'border-white/12 bg-white/8 text-white/60',
  }

  return (
    <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold', TRI_STATE_CLASSNAME[props.status])}>
      {TRI_STATE_LABEL[props.status]}
    </Badge>
  )
}
