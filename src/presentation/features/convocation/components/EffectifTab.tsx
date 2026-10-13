import type { ConvocationResponderStatus } from '@domain/repositories/convocation-responders-repository'
import type { ResponseCounts } from '@domain/rules/convocation-rules'
import type { CoachRosterStatusItem } from '@domain/usecases/convocation/GetConvocationRosterForCoachUseCase'
import { AddAttendeePanel } from '../attendees/AddAttendeePanel'
import type { AddAttendeeViewModel } from '../attendees/useAddAttendeeViewModel'
import { type AttendanceConfirmProps, RosterList, type SelfRosterProps } from './RosterList'

// Same variant split as RosterList mirrors below: the coach view's header
// shows the ✓/✗/? tally instead of the plain "N convoqués" count (AC-MD-10
// still holds for the player view — combining a visible "a répondu" badge
// with a visible aggregate would re-derive the individual status the rule
// forbids, specs/match_details_page.md §3, "Contrainte de recomposition —
// structurelle").
//
// specs/coach-attendance-confirmation.md §2/§6 — AttendanceConfirmProps
// spread onto the coach variant only, same reasoning as RosterList: a
// player never needs any of it (AC-AT-06/07).
type EffectifTabProps =
  | { variant: 'player'; self: SelfRosterProps; others: ConvocationResponderStatus[]; convokedCount: number }
  | ({
      variant: 'coach'
      roster: CoachRosterStatusItem[]
      responseCounts: ResponseCounts
      // specs/convocation-player-selection.md §4 — "Convoquer un joueur".
      addAttendee: AddAttendeeViewModel
    } & AttendanceConfirmProps)

export function EffectifTab(props: EffectifTabProps) {
  return (
    <div className="flex flex-col gap-5 px-5.5 pt-1 pb-8">
      {props.variant === 'player' ? (
        <RosterList variant="player" self={props.self} others={props.others} convokedCount={props.convokedCount} />
      ) : (
        <>
          <RosterList
            variant="coach"
            roster={props.roster}
            responseCounts={props.responseCounts}
            canValidateAttendance={props.canValidateAttendance}
            savingUserId={props.savingUserId}
            errorByUserId={props.errorByUserId}
            onConfirmPresent={props.onConfirmPresent}
            onConfirmAbsent={props.onConfirmAbsent}
          />
          <AddAttendeePanel attendee={props.addAttendee} />
        </>
      )}
    </div>
  )
}
