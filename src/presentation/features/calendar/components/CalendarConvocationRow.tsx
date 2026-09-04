import type { Convocation } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { Opponent } from '@domain/entities/opponent'
import { ResponseActions } from '@presentation/shared/components/ResponseActions'
import { ResponseBar } from '@presentation/shared/components/ResponseBar'
import { ScheduleInfo } from '@presentation/shared/components/ScheduleInfo'
import { StatusBadge } from '@presentation/features/convocation/components/StatusBadge'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import type { CalendarResponseBlock } from './calendar-response-block'
import { ResponseStatusPill } from './ResponseStatusPill'

interface CalendarConvocationRowProps {
  convocation: Convocation
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
  responseBlock: CalendarResponseBlock
  onOpen: (convocationId: string) => void
}

// specs/calendar.md UI design §"Structure de l'écran" point 3 — the "long"
// version of UpcomingList's/UpcomingConvocationList's row: same rail +
// bold-type-label shape as those two (reused verbatim, down to the exact
// class names, per the spec's own "même ligne, pas une nouvelle ligne"),
// with the additions this screen specifically asks for that a dashboard
// preview doesn't need: full ScheduleInfo (adversaire + RDV chip for a
// match, AC-CA-02), StatusBadge (closed/cancelled, AC-CA-16), and a
// response block that varies by role/pastness (see calendar-response-
// block.ts). Not literally UpcomingList itself — that component owns its
// own "À venir" section header + "Voir tout" link, neither of which
// belongs on a per-day list — so this is a sibling row built from the same
// shared primitives (ScheduleInfo, StatusBadge, ResponseBar, ResponseActions)
// rather than a fork of its markup.
export function CalendarConvocationRow({ convocation, matchDetails, opponent, meetingDetails, responseBlock, onOpen }: CalendarConvocationRowProps) {
  const accent = CONVOCATION_TYPE_ACCENT[convocation.type]

  // AC-CA-02 : un entraînement ne rend aucun champ de type qu'il ne
  // possède pas — pas de suffixe pour 'training', jamais d'espace vide
  // compensatoire. Same " | " punctuation as UpcomingConvocationList's own
  // meeting-title suffix, extended to the match/opponent case.
  const titleSuffix = convocation.type === 'match' && opponent ? ` | ${opponent.name}` : convocation.type === 'meeting' && meetingDetails ? ` | ${meetingDetails.title}` : ''

  const meetingPointTime = convocation.type === 'match' && matchDetails ? matchDetails.meetingPointTime : null

  return (
    // AC-CA-19: the row itself is the tap target for navigation (AC-CA-12)
    // — the nested response controls stop propagation on their own click
    // (ResponseActions/ResponseBar render inside a wrapping div below that
    // does so), same split already established by NextConvocationCard.
    <li
      role="button"
      tabIndex={0}
      onClick={() => onOpen(convocation.id)}
      className="relative flex min-h-11 flex-col gap-2.5 border-b border-white/8 py-3 pl-3.5 last:border-b-0"
    >
      <span aria-hidden className={`absolute top-0.5 bottom-3.5 left-0 w-[3px] rounded-full ${accent.rail}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13.5px] leading-[1.25] font-bold text-white">
            {formatConvocationType(convocation.type)}
            {titleSuffix}
          </p>
        </div>
        {/* AC-CA-16: only renders for closed/cancelled — StatusBadge itself
            returns nothing for 'open', so no extra branch needed here. */}
        <StatusBadge status={convocation.status} />
      </div>

      <ScheduleInfo dateIso={convocation.date} location={convocation.location} meetingPointTime={meetingPointTime} />

      <div onClick={(event) => event.stopPropagation()}>
        {responseBlock.kind === 'coach' && <ResponseBar counts={responseBlock.counts} />}
        {responseBlock.kind === 'player-actions' && (
          <ResponseActions
            canRespond={responseBlock.canRespond}
            myResponse={responseBlock.myResponse}
            onRespondPresent={responseBlock.onRespondPresent}
            onRespondAbsent={responseBlock.onRespondAbsent}
          />
        )}
        {responseBlock.kind === 'player-readonly' && (
          <div className="flex justify-end">
            <ResponseStatusPill status={responseBlock.myResponse} />
          </div>
        )}
      </div>
    </li>
  )
}
