import type { UpcomingConvocation } from '@domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase'
import { formatCountdown } from '../../../shared/formatters/countdown'
import { Badge } from '../../../shared/components/ui/badge'
import { Card } from '../../../shared/components/ui/card'
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
    <Card
      onClick={onOpen}
      role="button"
      tabIndex={0}
      className="flex cursor-pointer flex-col gap-3.5 rounded-[20px] border-white/10 bg-white/6 p-4.5 backdrop-blur-sm"
    >
      <div className="flex items-center justify-between">
        <span className="text-[11.5px] font-extrabold tracking-[0.05em] text-coach-green-label uppercase">
          PROCHAIN MATCH
        </span>
        <Badge className="rounded-full bg-coach-red-badge px-2.25 py-0.75 text-[10.5px] font-extrabold text-white">
          {formatCountdown(convocation.date, new Date())}
        </Badge>
      </div>

      {/* Opponent name — see TODO above, not modeled yet. */}
      <p className="text-[12.5px] text-white/60">
        {convocation.date} · {convocation.location}
      </p>

      <div onClick={(event) => event.stopPropagation()}>
        <ResponseBar counts={responseCounts} />
      </div>
    </Card>
  )
}
