import type { Section } from '@domain/entities/section'
import type { Team } from '@domain/entities/team'
import type { Role, RoleAssignment } from '@domain/entities/user'

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

// specs/web-users.md §2.2/UI design "Nouvelle cellule — pastilles rôle +
// portée" — originally a private helper of UserRolesCell.tsx. Extracted
// here by specs/web-users-role-edit-remove.md's own "Ce que la confirmation
// doit dire" (§7 of the amendment: "quel rôle et quelle portée disparaissent
// [...] même texte que la pastille elle-même, réutilisé") — RemoveRoleAssignmentDialog
// reuses this EXACT string rather than a second, divergent copy of the same
// rendering rule.
export function formatRoleAssignment(assignment: RoleAssignment, teamsById: Map<string, Team>, sectionsById: Map<string, Section>): string {
  const label = formatRole(assignment.role)
  switch (assignment.role) {
    case 'player':
      return `${label} · ${teamsById.get(assignment.teamId)?.name ?? ''}`
    case 'coach':
      // Same "join equipe names with a comma" convention CoachListCell
      // already applies to several coaches on one team, applied here to
      // several teams on one coach (§2.2).
      return `${label} · ${assignment.teamIds.map((teamId) => teamsById.get(teamId)?.name ?? '').join(', ')}`
    case 'section-manager':
      return `${label} · ${sectionsById.get(assignment.sectionId)?.name ?? ''}`
    default:
      // authorized-officer / treasurer / medical-referent / volunteer / admin
      // — no scope, label alone (mockup: "Référent médical").
      return label
  }
}

// specs/web-users-role-edit-remove.md §2.1/PO-WU-13/UI design "La pastille
// de rôle devient un contrôle" — "l'identification de la cible : le couple
// (rôle, portée actuelle), jamais le rôle seul": two assignments of the SAME
// role (two player affectations, two section-manager affectations) can
// coexist on one row, so `assignment.role` alone is no longer a safe,
// unique React key or dialog remount key. Shared by UserRolesCell (the
// pastille's own key) and EditRoleAssignmentDialog (its remount key, so
// clicking a DIFFERENT same-role pastille while the dialog is already open
// on another one resets its form state rather than silently reusing it).
export function scopeKeyOf(assignment: RoleAssignment): string {
  switch (assignment.role) {
    case 'player':
      return assignment.teamId
    case 'coach':
      return assignment.teamIds.slice().sort().join(',')
    case 'section-manager':
      return assignment.sectionId
    default:
      return 'none'
  }
}
