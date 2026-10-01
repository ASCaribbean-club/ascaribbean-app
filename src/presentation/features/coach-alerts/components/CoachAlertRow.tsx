import type { Convocation } from '@domain/entities/convocation'
import type { Opponent } from '@domain/entities/opponent'
import { AttendanceConfirmationAlert } from '@presentation/shared/components/AttendanceConfirmationAlert'
import { ScheduleInfo } from '@presentation/shared/components/ScheduleInfo'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { CONVOCATION_TYPE_ACCENT } from '@presentation/shared/formatters/convocation-type-accent'
import { GoalAttributionMissingAlert } from './GoalAttributionMissingAlert'
import { MatchScoreMissingAlert } from './MatchScoreMissingAlert'
import { getConvocationLocationLabel } from '@domain/rules/convocation-location'

interface CoachAlertRowProps {
  convocation: Convocation
  // Non-null only for a 'match' convocation with a resolved opponent — see
  // ListCoachAlertsUseCase's own CoachAlertItem.
  opponent: Opponent | null
  meetingPointTime: string | null
  attendanceConfirmationMissing: boolean
  matchScoreMissing: boolean
  goalAttributionMissing: boolean
  attributedGoalCount: number
  goalsFor: number | null
  onOpen: (convocationId: string) => void
}

// specs/coach-alerts.md §7/UI design "Composant nouveau" #2 — deliberately
// the Calendar row (`CalendarConvocationRow.tsx`), retired of everything
// this screen has no right to show: no StatusBadge (cancelled convocations
// are excluded at the source, §1 point 1), no ResponseBar/ResponseActions
// (no player role here, and a response aggregate is not a "missing
// action"), no match-outcome badge/score (AC-AL-03 — that's
// ConvocationDetailPage's content, never duplicated here). No team label
// either (AC-AL-20 — the active team is already named by the dashboard
// header this screen is reached from). The whole row is the tap target
// (AC-AL-03) — unlike CalendarConvocationRow, nothing nested needs its own
// stopPropagation: there is no clickable control on this row at all.
export function CoachAlertRow({
  convocation,
  opponent,
  meetingPointTime,
  attendanceConfirmationMissing,
  matchScoreMissing,
  goalAttributionMissing,
  attributedGoalCount,
  goalsFor,
  onOpen,
}: CoachAlertRowProps) {
  const accent = CONVOCATION_TYPE_ACCENT[convocation.type]
  // AC-AL-01 crossed with AC-CA-02 — never a suffix for a training, same
  // construction as CalendarConvocationRow's own titleSuffix.
  const titleSuffix = convocation.type === 'match' && opponent ? ` | ${opponent.name}` : ''

  return (
    <li
      role="button"
      tabIndex={0}
      onClick={() => onOpen(convocation.id)}
      // AC-AL-17 — "navigation clavier (CDC §12)" for THIS screen's own row:
      // a `role="button"` on a non-<button> element carries no native
      // Enter/Space activation, so it must be wired explicitly (a keyboard
      // user could otherwise focus the row but never activate it).
      onKeyDown={(event) => {
        if (event.key === 'Enter' || event.key === ' ') {
          event.preventDefault()
          onOpen(convocation.id)
        }
      }}
      className="relative flex min-h-11 flex-col gap-2.5 border-b border-white/8 py-3 pl-3.5 last:border-b-0"
    >
      <span aria-hidden className={`absolute top-0.5 bottom-3.5 left-0 w-[3px] rounded-full ${accent.rail}`} />

      <p className="m-0 text-[13.5px] leading-[1.25] font-bold text-white">
        {formatConvocationType(convocation.type)}
        {titleSuffix}
      </p>

      <ScheduleInfo dateIso={convocation.date} location={getConvocationLocationLabel(convocation)} meetingPointTime={meetingPointTime} />

      {/* At most two of the three chips together (B and C are structurally
          exclusive, §1 point 4) — wraps rather than overflows on a narrow
          phone width (UI design "Contraintes tactiles mobiles"). */}
      <div className="flex flex-wrap gap-1.5">
        <AttendanceConfirmationAlert visible={attendanceConfirmationMissing} />
        <MatchScoreMissingAlert visible={matchScoreMissing} />
        <GoalAttributionMissingAlert visible={goalAttributionMissing} attributedCount={attributedGoalCount} goalsFor={goalsFor} />
      </div>
    </li>
  )
}
