import type { Convocation } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { Opponent } from '@domain/entities/opponent'
import { AttendanceConfirmationAlert } from '@presentation/shared/components/AttendanceConfirmationAlert'
import { ResponseActions } from '@presentation/shared/components/ResponseActions'
import { ResponseBar } from '@presentation/shared/components/ResponseBar'
import { ScheduleInfo } from '@presentation/shared/components/ScheduleInfo'
import { SectionLabel } from '@presentation/shared/components/SectionLabel'
import type { SectionLabelView } from '@presentation/shared/formatters/section-label'
import { Badge } from '@presentation/shared/components/ui/badge'
import { StatusBadge } from '@presentation/features/convocation/components/StatusBadge'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { MATCH_OUTCOME_BADGE_CLASSNAME, MATCH_OUTCOME_LABEL } from '@presentation/shared/formatters/match-outcome-labels'
import { cn } from '@presentation/shared/lib/utils'
import type { CalendarMatchResult } from './calendar-list-item'
import type { CalendarResponseBlock } from './calendar-response-block'
import { ResponseCountsRecap } from './ResponseCountsRecap'
import { ResponseStatusPill } from './ResponseStatusPill'
import { getConvocationLocationLabel } from '@domain/rules/convocation-location'

interface CalendarConvocationRowProps {
  convocation: Convocation
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
  responseBlock: CalendarResponseBlock
  matchResult: CalendarMatchResult | null
  attendanceConfirmationMissing: boolean
  // Dirigeant rows only (specs/mobile-dirigeant-habilite.md §1.2).
  sectionLabel?: SectionLabelView | null
  // Optional: absent => the row is NOT a button (no role, no tabIndex, no
  // tap target).
  onOpen?: (convocationId: string) => void
}

// specs/calendar.md UI design §"Structure de l'écran" point 3 — the "long"
// version of UpcomingList's/UpcomingConvocationList's row: same rail +
// bold-type-label shape as those two (reused verbatim, down to the exact
// class names, per the spec's own "même ligne, pas une nouvelle ligne"),
// with the additions this screen specifically asks for that a dashboard
// preview doesn't need: full ScheduleInfo (adversaire + RDV chip for a
// match, AC-CA-02), StatusBadge (cancelled only since the 2026-09-30
// AC-CA-16 override, see calendar-list-item.ts), and a response block that
// varies by role/pastness (see calendar-response-block.ts). Not literally UpcomingList itself — that component owns its
// own "À venir" section header + "Voir tout" link, neither of which
// belongs on a per-day list — so this is a sibling row built from the same
// shared primitives (ScheduleInfo, StatusBadge, ResponseBar, ResponseActions)
// rather than a fork of its markup.
export function CalendarConvocationRow({
  convocation,
  matchDetails,
  opponent,
  meetingDetails,
  responseBlock,
  matchResult,
  attendanceConfirmationMissing,
  sectionLabel,
  onOpen,
}: CalendarConvocationRowProps) {
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
      role={onOpen ? 'button' : undefined}
      tabIndex={onOpen ? 0 : undefined}
      onClick={onOpen ? () => onOpen(convocation.id) : undefined}
      className={cn('relative flex flex-col gap-2.5 border-b border-white/8 py-3 pl-3.5 last:border-b-0', onOpen && 'min-h-11')}
    >
      <span aria-hidden className={`absolute top-0.5 bottom-3.5 left-0 w-[3px] rounded-full ${accent.rail}`} />

      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="m-0 text-[13.5px] leading-[1.25] font-bold text-white">
            {formatConvocationType(convocation.type)}
            {titleSuffix}
          </p>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          {/* Développeuse, 2026-09-30 — AC-CA-15 override (see
              specs/calendar.md's own dated note): the recorded score of a
              PAST match, `null` (hence absent, not a placeholder) for every
              other case — see buildMatchResult's own comment. */}
          {matchResult && (
            <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold', MATCH_OUTCOME_BADGE_CLASSNAME[matchResult.outcome])}>
              {MATCH_OUTCOME_LABEL[matchResult.outcome]} {matchResult.goalsFor}–{matchResult.goalsAgainst}
            </Badge>
          )}
          {/* Développeuse, 2026-09-30 — AC-CA-16 override (see specs/
              calendar.md's own dated note): coach-only, `false` for every
              player item — see calendar-list-item.ts's own comment. */}
          <AttendanceConfirmationAlert visible={attendanceConfirmationMissing} />
          {/* AC-CA-16: only renders for 'cancelled' now — StatusBadge itself
              returns nothing for 'open'/'closed', so no extra branch needed
              here. */}
          <StatusBadge status={convocation.status} />
          {sectionLabel && <SectionLabel name={sectionLabel.name} type={sectionLabel.type} />}
        </div>
      </div>

      <ScheduleInfo dateIso={convocation.date} location={getConvocationLocationLabel(convocation)} meetingPointTime={meetingPointTime} />

      {responseBlock.kind !== 'none' && (
      <div onClick={(event) => event.stopPropagation()}>
        {responseBlock.kind === 'coach' && <ResponseBar counts={responseBlock.counts} />}
        {responseBlock.kind === 'coach-past' && <ResponseCountsRecap counts={responseBlock.counts} />}
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
      )}
    </li>
  )
}
