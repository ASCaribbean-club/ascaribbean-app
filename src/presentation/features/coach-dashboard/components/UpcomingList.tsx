import type { ConvocationType } from '@domain/entities/convocation'
import type { UpcomingConvocation } from '@domain/usecases/coach-dashboard/ListUpcomingTeamConvocationsUseCase'

interface UpcomingListProps {
  items: UpcomingConvocation[]
  onOpen: (convocationId: string) => void
  onSeeAll: () => void
}

// Type → couleur du liseré (UI design §4) : mapping d'affichage pur, pas une
// règle métier, donc pas de TODO/décision ici.
const TYPE_ACCENT: Record<ConvocationType, string> = {
  training: 'upcoming-list__item--training',
  meeting: 'upcoming-list__item--meeting',
  match: 'upcoming-list__item--match',
}

export function UpcomingList({ items, onOpen, onSeeAll }: UpcomingListProps) {
  return (
    <section className="upcoming-list">
      <div className="upcoming-list__header">
        <h2>À venir</h2>
        <button type="button" className="upcoming-list__see-all" onClick={onSeeAll}>
          Voir tout
        </button>
      </div>

      {items.length === 0 ? (
        // AC-CD-02 : état vide explicite, jamais une liste vide silencieuse.
        <p className="upcoming-list__empty">Aucune échéance à venir</p>
      ) : (
        <ul>
          {items.map(({ convocation, responseCounts }) => {
            const total = responseCounts.present + responseCounts.absent + responseCounts.pending
            const responded = responseCounts.present + responseCounts.absent
            return (
              <li
                key={convocation.id}
                className={`upcoming-list__item ${TYPE_ACCENT[convocation.type]}`}
                onClick={() => onOpen(convocation.id)}
              >
                <p className="upcoming-list__item-title">{convocation.type}</p>
                <p className="upcoming-list__item-meta">
                  {convocation.date} · {convocation.location}
                </p>
                <span className="upcoming-list__item-rate">
                  {responded}/{total}
                </span>
                {/* AC-CD-05b / PO-4 : pas de bouton "Relancer" par ligne. */}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
