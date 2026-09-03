import type { ConvocationResponderStatus } from '@domain/repositories/convocation-responders-repository'
import type { ResponseCounts } from '@domain/rules/convocation-rules'
import type { CoachRosterStatusItem } from '@domain/usecases/convocation/GetConvocationRosterForCoachUseCase'
import { ResponseBar } from '@presentation/shared/components/ResponseBar'
import { RosterList, type SelfRosterProps } from './RosterList'

// Same variant split as RosterList, one level up: the coach view additionally
// gets the ResponseBar aggregate ABOVE the roster (UI design §"Structure de
// l'écran", point 4 — "réutilise ResponseBar.tsx tel quel, en tête de
// l'onglet"), the player view never does (AC-MD-10 — combining a visible
// "a répondu" badge with a visible aggregate would re-derive the individual
// status the rule forbids, specs/match_details_page.md §3, "Contrainte de
// recomposition — structurelle").
type EffectifTabProps =
  | { variant: 'player'; self: SelfRosterProps; others: ConvocationResponderStatus[] }
  | { variant: 'coach'; roster: CoachRosterStatusItem[]; responseCounts: ResponseCounts }

export function EffectifTab(props: EffectifTabProps) {
  return (
    <div className="flex flex-col gap-5 px-5.5 pt-1 pb-8">
      {props.variant === 'coach' && (
        <div className="rounded-2xl border border-white/10 bg-white/5 p-4">
          {/* UI design §"États à couvrir": ResponseBar collapses to a
              zero-width bar when total === 0 (nobody's responded yet) —
              flagged as an open point (Questions ouvertes UI #4, still open)
              rather than patched here, since a fix to this shared component
              would also affect coach-dashboard's own usage. */}
          <ResponseBar counts={props.responseCounts} />
        </div>
      )}

      {props.variant === 'player' ? (
        <RosterList variant="player" self={props.self} others={props.others} />
      ) : (
        <RosterList variant="coach" roster={props.roster} />
      )}
    </div>
  )
}
