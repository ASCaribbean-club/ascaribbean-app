import type { PlayerPosition } from '@domain/entities/user'

// Same French labels as the Effectif mockup ("Gardienne", "Milieu", ...).
const PLAYER_POSITION_LABELS: Record<PlayerPosition, string> = {
  goalkeeper: 'Gardienne',
  defender: 'Défenseure',
  midfielder: 'Milieu',
  forward: 'Attaquante',
}

export function formatPlayerPosition(position: PlayerPosition | null): string | null {
  return position ? PLAYER_POSITION_LABELS[position] : null
}
