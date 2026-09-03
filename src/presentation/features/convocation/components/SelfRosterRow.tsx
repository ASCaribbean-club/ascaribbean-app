import type { DeclaredStatus } from '@domain/entities/convocation'
import type { PlayerPosition } from '@domain/entities/user'
import { formatPlayerPosition } from '@presentation/shared/formatters/player-position-labels'
import { ResponseActions } from '@presentation/shared/components/ResponseActions'
import { Separator } from '@presentation/shared/components/ui/separator'
import { InitialsAvatar } from './InitialsAvatar'
import { ResponderStatusBadge } from './ResponderStatusBadge'

interface SelfRosterRowProps {
  name: string
  position: PlayerPosition | null
  canRespond: boolean
  myResponse: DeclaredStatus | null
  onRespondPresent: () => void
  onRespondAbsent: () => void
}

// The player's own row, always first in the Effectif list (UI design
// §"Nouveau composant — liste Effectif": "<nom> (moi)" in the
// mockup) — never rendered for the coach view, which has no "own response"
// concept (§2, "un coach ne répond pas"). `canRespond`/`myResponse` and the
// two `onRespond*` callbacks are exactly ResponseActions' own props
// (specs/player-dashboard.md), just laid out inline in a roster row instead
// of NextConvocationCard's separate card — a different POSITION for the
// same component, not a rewrite of its present/absent logic.
export function SelfRosterRow({ name, position, canRespond, myResponse: currentPlayerResponse, onRespondPresent, onRespondAbsent }: SelfRosterRowProps) {
  // ResponseActions renders nothing at all once canRespond is false and no
  // response was recorded (AC-MD-13) — skip the second row entirely rather
  // than leaving an empty flex row with a stray gap under the name.
  const hasVisibleResponseState = canRespond || currentPlayerResponse === 'present' || currentPlayerResponse === 'absent'
  const positionLabel = formatPlayerPosition(position)
  const responsePrompt = !canRespond
    ? null
    : currentPlayerResponse === null
      ? { text: "Tu n'as pas encore répondu", weight: 'font-bold' }
      : { text: 'Modifier ta réponse', weight: 'font-medium' }

  return (
    <li className="flex flex-col gap-3 rounded-2xl border border-white/15 bg-white/8 px-4 py-3.5">
      <div className="flex items-center gap-3">
        <InitialsAvatar name={name} />
        <div className="min-w-0 flex-1">
          <p className="text-[13.5px] font-semibold text-white">{name} (moi)</p>
          {positionLabel && <p className="text-[12px] text-white/50">{positionLabel}</p>}
        </div>
        {/* Binary badge, not the coach-only tri-state aggregate: this shows
            the player's own response, not another player's. */}
        <ResponderStatusBadge variant="binary" hasResponded={currentPlayerResponse !== null} />
      </div>
      <Separator className="bg-white/8" />


      {hasVisibleResponseState && (
        <div className="flex items-center gap-3">
          {responsePrompt && (
            <p className={`text-[10.5px] ${responsePrompt.weight} text-white/45 uppercase tracking-[0.03em] flex-1`}>
              {responsePrompt.text}
            </p>
          )}
          <div className="ml-auto">
            <ResponseActions
              canRespond={canRespond}
              myResponse={currentPlayerResponse}
              onRespondPresent={onRespondPresent}
              onRespondAbsent={onRespondAbsent}
              size="compact"
            />
          </div>
        </div>
      )}
    </li>
  )
}
