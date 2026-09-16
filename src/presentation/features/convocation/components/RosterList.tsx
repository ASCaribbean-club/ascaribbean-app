import type { DeclaredStatus } from '@domain/entities/convocation'
import type { ResponseCounts } from '@domain/rules/convocation-rules'
import type { PlayerPosition } from '@domain/entities/user'
import type { ConvocationResponderStatus } from '@domain/repositories/convocation-responders-repository'
import type { CoachRosterStatusItem } from '@domain/usecases/convocation/GetConvocationRosterForCoachUseCase'
import { ResponderStatusBadge } from './ResponderStatusBadge'
import { RosterRow } from './RosterRow'
import { SelfRosterRow } from './SelfRosterRow'

export interface SelfRosterProps {
  name: string
  position: PlayerPosition | null
  canRespond: boolean
  myResponse: DeclaredStatus | null
  onRespondPresent: () => void
  onRespondAbsent: () => void
}

// Discriminated union, same reasoning as ResponderStatusBadge: a player
// never sees `roster` (tri-state, coach-only, AC-MD-10) and a coach never
// sees `self` (a coach doesn't respond, §2) — the two variants are
// literally mutually exclusive props, not two optional halves of one shape.
type RosterListProps =
  | { variant: 'player'; self: SelfRosterProps; others: ConvocationResponderStatus[] }
  | { variant: 'coach'; roster: CoachRosterStatusItem[]; responseCounts: ResponseCounts }

// UI design §"Nouveau composant — liste Effectif": section header ("Qui a
// répondu" + compteur d'effectif, same position/style as existing
// "DESTINATAIRES · N sélectionnés" headers elsewhere in the app) followed by
// the roster. The FULL convoked roster is always rendered, never filtered
// to responders only (AC-MD-09) — including the "personne n'a encore
// répondu" case, which is just this same list with every badge showing "en
// attente"/"pending", not a special empty state (UI design §"États à
// couvrir").
//
// The coach variant's counter is the ✓/✗/? tally instead of the player
// variant's plain "N convoqués" — same aggregate the old ResponseBar showed,
// folded into this one header row rather than a separate row above it.
export function RosterList(props: RosterListProps) {
  const count = props.variant === 'player' ? props.others.length + 1 : props.roster.length

  return (
    <div className="flex flex-col gap-2.5 pt-4">
      <div className="flex items-baseline justify-between">
        <span className="text-[11.5px] font-extrabold tracking-wide text-white/50 uppercase">Qui a répondu</span>
        {props.variant === 'player' ? (
          <span className="text-[11.5px] font-bold text-white/40">{count} convoqué{count > 1 ? 's' : ''}</span>
        ) : (
          <ul className="m-0 flex list-none items-center gap-3 p-0 text-[13px] font-bold">
            <li className="flex items-center gap-1 text-coach-green-text">
              <span aria-hidden>✓</span>
              {props.responseCounts.present}
              <span className="sr-only"> présents</span>
            </li>
            <li className="flex items-center gap-1 text-coach-red-text">
              <span aria-hidden>✗</span>
              {props.responseCounts.absent}
              <span className="sr-only"> absents</span>
            </li>
            <li className="flex items-center gap-1 text-white/50">
              <span aria-hidden>?</span>
              {props.responseCounts.pending}
              <span className="sr-only"> en attente</span>
            </li>
          </ul>
        )}
      </div>

      <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
        {props.variant === 'player' ? (
          <>
            <SelfRosterRow
              name={props.self.name}
              position={props.self.position}
              canRespond={props.self.canRespond}
              myResponse={props.self.myResponse}
              onRespondPresent={props.self.onRespondPresent}
              onRespondAbsent={props.self.onRespondAbsent}
            />
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
          props.roster.map((entry) => (
            <RosterRow
              key={entry.userId}
              name={entry.displayName}
              position={entry.position}
              badge={<ResponderStatusBadge variant="tri-state" status={entry.status} />}
            />
          ))
        )}
      </ul>
    </div>
  )
}
