import type { ConvocationType } from '@domain/entities/convocation'
import type { UpcomingConvocation } from '@domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase'
import { Badge } from '../../../shared/components/ui/badge'
import { formatConvocationType } from '../../../shared/formatters/convocation-labels'

interface UpcomingListProps {
  items: UpcomingConvocation[]
  onOpen: (convocationId: string) => void
  onSeeAll: () => void
}

// Type → couleur du liseré + du badge de taux (UI design §4) : mapping
// d'affichage pur, pas une règle métier, donc pas de TODO/décision ici.
const TYPE_ACCENT: Record<ConvocationType, { rail: string; badge: string }> = {
  training: { rail: 'bg-coach-green', badge: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text' },
  meeting: { rail: 'bg-coach-amber', badge: 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber' },
  match: { rail: 'bg-coach-red', badge: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text' },
}

export function UpcomingList({ items, onOpen, onSeeAll }: UpcomingListProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-extrabold text-white">À venir</h2>
        <button type="button" className="text-[13px] font-semibold text-coach-green-link" onClick={onSeeAll}>
          Voir tout
        </button>
      </div>

      {items.length === 0 ? (
        // AC-CD-02 : état vide explicite, jamais une liste vide silencieuse.
        <p className="text-[13px] text-white/50">Aucune échéance à venir</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map(({ convocation, responseCounts }) => {
            const total = responseCounts.present + responseCounts.absent + responseCounts.pending
            const responded = responseCounts.present + responseCounts.absent
            const accent = TYPE_ACCENT[convocation.type]
            return (
              <li
                key={convocation.id}
                className="relative mb-3 flex items-start justify-between gap-3 border-b border-white/8 py-0 pb-3 pl-3.5 last:mb-0 last:border-b-0 last:pb-0"
                onClick={() => onOpen(convocation.id)}
              >
                <span aria-hidden className={`absolute top-0.5 bottom-3.5 left-0 w-[3px] rounded-full ${accent.rail}`} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13.5px] leading-[1.25] font-bold text-white">
                    {formatConvocationType(convocation.type)}
                  </p>
                  <p className="m-0 mt-0.75 text-[11.5px] font-semibold text-white/50">
                    {convocation.date} · {convocation.location}
                  </p>
                </div>
                <Badge className={`shrink-0 rounded-full px-2.25 py-0.75 text-[10.5px] font-extrabold ${accent.badge}`}>
                  {responded}/{total}
                </Badge>
                {/* AC-CD-05b / PO-4 : pas de bouton "Relancer" par ligne. */}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
