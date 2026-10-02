import { MISSIONS_CLOSED_MESSAGE } from '@presentation/shared/errors/map-domain-error-to-ui-error'

// specs/match-details-missions.md UI design "Échéance dépassée" — player
// variant only. The information is carried by the text, the round marker is
// decoration.
export function MissionsClosedBanner() {
  return (
    <div role="status" className="flex items-start gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3">
      <span aria-hidden className="mt-1 size-2.5 shrink-0 rounded-full bg-white/50" />
      <p className="min-w-0 text-[12.5px] text-white/70">{MISSIONS_CLOSED_MESSAGE}</p>
    </div>
  )
}
