import type { ReactNode } from 'react'
import type { PlayerPosition } from '@domain/entities/user'
import { formatPlayerPosition } from '../../../shared/formatters/player-position-labels'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'

interface RosterRowProps {
  name: string
  position: PlayerPosition | null
  // A pre-built ResponderStatusBadge element rather than a `status`/
  // `hasResponded` prop here — keeps RosterRow itself agnostic of which of
  // the two variants (binary vs tri-state) it's rendering; the caller
  // (RosterList) already knows which one applies for the current viewer.
  badge: ReactNode
}

// One line of the "Effectif" roster — UI design §"Nouveau composant — liste
// Effectif": avatar (initiales) + nom (+ sous-libellé de poste, "Gardienne",
// "Milieu"...) + indicateur de fin de ligne (ici, le badge lui-même).
// Correction obligatoire #10 originally removed the position sub-label for
// lack of domain support — reversed 2026-09-01 now that `User.position`
// exists (domain/entities/user.ts); omitted only when null (non-players,
// or a player with no position set).
export function RosterRow({ name, position, badge }: RosterRowProps) {
  const positionLabel = formatPlayerPosition(position)

  return (
    <li className="flex items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-3.5">
      <InitialsAvatar name={name} />
      <div className="min-w-0 flex-1">
        <p className="text-[13.5px] font-semibold text-white">{name}</p>
        {positionLabel && <p className="text-[12px] text-white/50">{positionLabel}</p>}
      </div>
      {badge}
    </li>
  )
}
