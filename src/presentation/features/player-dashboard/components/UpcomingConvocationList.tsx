import type { ConvocationForPlayer } from '@/domain/usecases/player-dashboard/ListUConvocationsForPlayerUseCase'
import { CONVOCATION_TYPE_ACCENT } from '../../../shared/formatters/convocation-type-accent'
import { formatConvocationType } from '../../../shared/formatters/convocation-labels'
import { formatEventSchedule } from '../../../shared/formatters/match-schedule'

interface UpcomingConvocationListProps {
  items: ConvocationForPlayer[]
  onOpen: (convocationId: string) => void
  onSeeAll: () => void
}

// Player's version of coach-dashboard's UpcomingList — same liseré/titre/
// sous-ligne row shape, same colors (CONVOCATION_TYPE_ACCENT, shared
// specifically so both screens stay consistent — see that formatter's own
// comment). Not the SAME component because the two screens' item shapes
// genuinely differ: coach's ConvocationForCoach carries a team-wide
// `responseCounts` aggregate, this screen's ConvocationForPlayer
// carries the player's own `myResponse` instead — and per specs/
// player-dashboard.md §6 corrections 3 & 4 (AC-PD-09, AC-PD-10), this list
// renders neither a rate badge ("15/18") nor a "⋮" menu, so there would be
// nothing left to parameterize away even if the shapes did match.
export function UpcomingConvocationList({ items, onOpen, onSeeAll }: UpcomingConvocationListProps) {
  return (
    <section>
      <div className="mb-3 flex items-baseline justify-between">
        <h2 className="text-[15px] font-extrabold text-white">À venir</h2>
        <button type="button" className="text-[13px] font-semibold text-coach-green-link" onClick={onSeeAll}>
          Voir tout
        </button>
      </div>

      {items.length === 0 ? (
        // AC-PD-02 : état vide explicite, jamais une liste vide silencieuse.
        <p className="text-[13px] text-white/50">Aucune échéance à venir</p>
      ) : (
        <ul className="m-0 flex list-none flex-col p-0">
          {items.map(({ convocation, meetingDetails }) => {
            const accent = CONVOCATION_TYPE_ACCENT[convocation.type]
            return (
              <li
                key={convocation.id}
                className="relative mb-3 flex items-start gap-3 border-b border-white/8 py-0 pb-3 pl-3.5 last:mb-0 last:border-b-0 last:pb-0"
                onClick={() => onOpen(convocation.id)}
              >
                <span aria-hidden className={`absolute top-0.5 bottom-3.5 left-0 w-0.75 rounded-full ${accent.rail}`} />
                <div className="min-w-0 flex-1">
                  <p className="m-0 text-[13.5px] leading-tight font-bold text-white">
                    {formatConvocationType(convocation.type)} {meetingDetails ? `| ${meetingDetails.title}` : ''}
                  </p>
                  <p className="m-0 mt-0.75 text-[11.5px] font-semibold text-white/50">
                    {formatEventSchedule(convocation.date, convocation.location)}
                  </p>
                </div>
                {/* AC-PD-09 / AC-PD-10 : ni compteur "N/M convoqués", ni
                    menu "⋮" — la ligne s'arrête à la sous-ligne. */}
              </li>
            )
          })}
        </ul>
      )}
    </section>
  )
}
