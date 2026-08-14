import type { Role } from '@domain/entities/user'

// CLAUDE.md §1 — the club's 8 roles, French display labels.
const ROLE_LABELS: Record<Role, string> = {
  player: 'Joueur',
  coach: 'Coach',
  'section-manager': 'Responsable de section',
  'authorized-officer': 'Dirigeant habilité',
  treasurer: 'Trésorier',
  'medical-referent': 'Référent médical',
  volunteer: 'Bénévole',
  admin: 'Administrateur',
}

export function formatRole(role: Role): string {
  return ROLE_LABELS[role]
}
