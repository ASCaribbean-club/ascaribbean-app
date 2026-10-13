import type { DeclaredStatus } from '@domain/entities/convocation'
import type { ResponseCounts } from '@domain/rules/convocation-rules'
import type { PlayerPosition } from '@domain/entities/user'
import type { ConvocationResponderStatus } from '@domain/repositories/convocation-responders-repository'
import type { CoachRosterStatusItem } from '@domain/usecases/convocation/GetConvocationRosterForCoachUseCase'
import { AttendanceConfirmRow } from './AttendanceConfirmRow'
import { ResponderStatusBadge } from './ResponderStatusBadge'
import { RosterRow } from './RosterRow'
import { SelfRosterRow } from './SelfRosterRow'

export interface SelfRosterProps {
  // specs/convocation-player-selection.md PO-CPS-03 (hypothesis) — false when
  // the player is not on the list of convoked players: no Présent / Absent
  // buttons, an information line instead.
  isConvoked: boolean
  name: string
  position: PlayerPosition | null
  canRespond: boolean
  myResponse: DeclaredStatus | null
  onRespondPresent: () => void
  onRespondAbsent: () => void
}

// specs/coach-attendance-confirmation.md §2/§6 — everything a coach roster
// row needs to render its confirmation controls, grouped so RosterList's
// coach branch stays a plain prop-threading passthrough rather than
// growing a pile of loose function/state props at the JSX call site.
export interface AttendanceConfirmProps {
  // Render-time gate, AC-AT-06/07 (moindre privilège: absent, never
  // disabled): false for any non-authorized viewer, including a coach whose
  // active team doesn't match this convocation's. When false, every row
  // falls back to the plain, non-interactive RosterRow below — this prop
  // does NOT get threaded further down into AttendanceConfirmRow, which is
  // simply never mounted for that case.
  canValidateAttendance: boolean
  // Scoped to a single row at a time (see AttendanceConfirmRow's own
  // `isSaving` doc) — `null` means no row is currently saving.
  savingUserId: string | null
  // Keyed by userId, so one row's failed write never affects another's
  // (UI design §"État d'écriture en cours / échouée, par ligne").
  errorByUserId: Record<string, string>
  onConfirmPresent: (userId: string) => void
  onConfirmAbsent: (userId: string) => void
}

// Discriminated union, same reasoning as ResponderStatusBadge: a player
// never sees `roster` (tri-state, coach-only, AC-MD-10) and a coach never
// sees `self` (a coach doesn't respond, §2) — the two variants are
// literally mutually exclusive props, not two optional halves of one shape.
type RosterListProps =
  | { variant: 'player'; self: SelfRosterProps; others: ConvocationResponderStatus[]; responseCounts: ResponseCounts }
  | ({ variant: 'coach'; roster: CoachRosterStatusItem[]; responseCounts: ResponseCounts } & AttendanceConfirmProps)

// UI design §"Nouveau composant — liste Effectif": section header ("Qui a
// répondu" + compteur d'effectif, same position/style as existing
// "DESTINATAIRES · N sélectionnés" headers elsewhere in the app) followed by
// the roster. The FULL convoked roster is always rendered, never filtered
// to responders only (AC-MD-09) — including the "personne n'a encore
// répondu" case, which is just this same list with every badge showing "en
// attente"/"pending", not a special empty state (UI design §"États à
// couvrir").
//
// Both variants' counter is the ✓/✗/? tally (numbers only for a player),
// folded into this one header row rather than a separate row above it.
export function RosterList(props: RosterListProps) {
  const { present, absent, pending } = props.responseCounts

  return (
    <div className="flex flex-col gap-2.5 pt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px] font-extrabold tracking-wide text-white/50 uppercase">Qui a répondu</span>
        {/* Same ✓/✗/? tally for both variants; only the coach also sees who
            answered what in the rows below. */}
        <ul className="m-0 flex list-none items-center gap-3 p-0 text-[13px] font-bold">
          <li className="flex items-center gap-1 text-coach-green-text">
            <span aria-hidden>✓</span>
            {present}
            <span className="sr-only"> présents</span>
          </li>
          <li className="flex items-center gap-1 text-coach-red-text">
            <span aria-hidden>✗</span>
            {absent}
            <span className="sr-only"> absents</span>
          </li>
          <li className="flex items-center gap-1 text-white/50">
            <span aria-hidden>?</span>
            {pending}
            <span className="sr-only"> en attente</span>
          </li>
        </ul>
      </div>

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {props.variant === 'player' ? (
          <>
            {props.self.isConvoked ? (
              <SelfRosterRow
                name={props.self.name}
                position={props.self.position}
                canRespond={props.self.canRespond}
                myResponse={props.self.myResponse}
                onRespondPresent={props.self.onRespondPresent}
                onRespondAbsent={props.self.onRespondAbsent}
              />
            ) : (
              <RosterRow
                name={`${props.self.name} (moi)`}
                position={props.self.position}
                badge={<span className="text-[12px] font-semibold text-white/60">Non convoqué(e)</span>}
              />
            )}
            {props.others.map((responder) => (
              <RosterRow
                key={responder.userId}
                name={responder.displayName}
                position={responder.position}
                badge={<ResponderStatusBadge variant="binary" hasResponded={responder.hasResponded} />}
              />
            ))}
          </>
        ) : (
          props.roster.map((entry) =>
            // AC-AT-06/07 — the confirmation controls are ABSENT (not
            // disabled) for a non-authorized viewer, falling back to the
            // exact same RosterRow the player variant renders above rather
            // than a greyed-out AttendanceConfirmRow.
            props.canValidateAttendance ? (
              <AttendanceConfirmRow
                key={entry.userId}
                name={entry.displayName}
                position={entry.position}
                declaredStatus={entry.status}
                actualStatus={entry.actualStatus}
                isSaving={props.savingUserId === entry.userId}
                errorMessage={props.errorByUserId[entry.userId] ?? null}
                onConfirmPresent={() => props.onConfirmPresent(entry.userId)}
                onConfirmAbsent={() => props.onConfirmAbsent(entry.userId)}
              />
            ) : (
              <RosterRow
                key={entry.userId}
                name={entry.displayName}
                position={entry.position}
                badge={<ResponderStatusBadge variant="tri-state" status={entry.status} />}
              />
            ),
          )
        )}
      </ul>
    </div>
  )
}
