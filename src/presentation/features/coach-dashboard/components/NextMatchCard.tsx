import type { UpcomingConvocation } from '@domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase'
import { formatCountdown } from '../../../shared/formatters/countdown'
import { ResponseBar } from './ResponseBar'

interface NextMatchCardProps {
  nextMatch: UpcomingConvocation | undefined
  onOpen: () => void
}

// TODO (schema gap, don't guess): the maquette shows an "adversaire" name
// and a separate "heure de RDV" distinct from the match date/time, but
// domain/entities/convocation.ts has neither an opponent field nor a second
// time field — only `date` and `location`. This isn't wiring, it's a data
// model gap: confirm with PO whether Convocation needs new fields (or
// whether "adversaire" lives elsewhere, e.g. derived from `location`) before
// finishing this card. Rendered below with `convocation.location` only,
// opponent/RDV intentionally left out rather than faked.
export function NextMatchCard({ nextMatch, onOpen }: NextMatchCardProps) {
  if (!nextMatch) return null // AC-CD-02 : état vide géré par le parent (aucune échéance à venir)

  const { convocation, responseCounts } = nextMatch

  return (
    // UI design §2 : tape sur la carte "hors zone barre" ouvre le détail —
    // la barre elle-même n'est qu'un indicateur (PO-4), d'où le
    // stopPropagation ci-dessous plutôt qu'un <button> englobant toute la carte.
    <div className="next-match-card" onClick={onOpen} role="button" tabIndex={0}>
      <div className="next-match-card__band">
        <span>PROCHAIN MATCH</span>
        <span className="next-match-card__countdown">{formatCountdown(convocation.date, new Date())}</span>
      </div>

      {/* Opponent name — see TODO above, not modeled yet. */}
      <p className="next-match-card__meta">
        {convocation.date} · {convocation.location}
      </p>

      <div onClick={(event) => event.stopPropagation()}>
        <ResponseBar counts={responseCounts} />
      </div>
    </div>
  )
}
