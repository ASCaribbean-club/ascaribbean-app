import type { Section } from '@domain/entities/section'
import type { Team } from '@domain/entities/team'
import type { AssignableRoleAssignment, RoleAssignment } from '@domain/entities/user'
import { Badge } from '@presentation/shared/components/ui/badge'
import { formatRoleAssignment, scopeKeyOf } from '@presentation/shared/formatters/role-labels'

interface UserRolesCellProps {
  roles: RoleAssignment[]
  teamsById: Map<string, Team>
  sectionsById: Map<string, Section>
  // specs/web-users-role-edit-remove.md UI design "La pastille de rôle
  // devient un contrôle" — the SAME boolean "+ Rôle" is already gated on
  // (§ "Ce qui change par rôle": "canAssignRole, le même booléen que «
  // + Rôle »"), never a second, narrower one invented for this cell.
  canAssignRole: boolean
  onSelectAssignment: (assignment: AssignableRoleAssignment) => void
}

// specs/web-users.md §2.2/UI design "Nouvelle cellule — pastilles rôle +
// portée" — the RÔLES column. `roles` carries ids only
// (AdminUserDirectoryEntry's own comment on why); this component is where
// those ids become the team/section NAMES the mockup shows, from maps the
// ViewModel already resolved once for the whole table (never a per-cell
// network call).
//
// specs/web-users-role-edit-remove.md §2.1/§2.4/UI design "La pastille de
// rôle devient un contrôle" (amendement du 2026-09-18) — six of the seven
// assignable pastilles are now real `button`s (opening EditRoleAssignmentDialog
// on click); the `Administrateur` pastille stays exactly as before, no
// affordance of any kind (§2.4: a decision, not an omission — never a
// disabled <button>, which would still look like a broken control).
// One shared look for every pastille (inert or interactive) so a row never
// mixes chip heights.
const CHIP_CLASS = 'h-7 rounded-full border-white/15 bg-white/10 px-3 text-xs font-medium text-white/70'
const INTERACTIVE_CHIP_CLASS =
  "relative cursor-pointer before:absolute before:inset-x-0 before:-inset-y-2 before:content-[''] hover:bg-white/20 focus-visible:ring-2 focus-visible:ring-white/40 focus-visible:ring-offset-1"

export function UserRolesCell({ roles, teamsById, sectionsById, canAssignRole, onSelectAssignment }: UserRolesCellProps) {
  if (roles.length === 0) {
    // AC-WU-18 — explicit text, never a blank cell, and the mockup's own
    // grey "Aucun rôle" treatment (same convention as CoachListCell's
    // "Aucun coach").
    return <span className="text-white/50">Aucun rôle</span>
  }

  return (
    <div className="flex flex-wrap items-center gap-1.5">
      {roles.map((assignment) => {
        const label = formatRoleAssignment(assignment, teamsById, sectionsById)
        // §2.1 of the amendment/PO-WU-13 — two pastilles of the SAME role
        // (two section-manager affectations, two player affectations) can
        // coexist on one row: `assignment.role` alone is no longer a safe,
        // unique key. Composed with the assignment's own current scope
        // instead (the exact natural key the click targets, §2.1).
        const key = `${assignment.role}:${scopeKeyOf(assignment)}`

        if (assignment.role === 'admin') {
          // §2.4 — inert, always: no hover, no focus-visible, no
          // cursor-pointer, no title/tooltip promising an action that will
          // never exist from this screen.
          return (
            <Badge key={key} className={CHIP_CLASS}>
              {label}
            </Badge>
          )
        }

        if (!canAssignRole) {
          // AC-WU-53 — a control the ViewModel says isn't authorized
          // disappears; here that means only the CLICK AFFORDANCE
          // disappears, the pastille's own data still renders (same
          // reasoning as the 'admin' branch above, applied to any actor
          // this screen might one day admit without 'role:assign', PO-WE-01).
          return (
            <Badge key={key} className={CHIP_CLASS}>
              {label}
            </Badge>
          )
        }

        return (
          // Same visual size as the inert pastilles; the 44px touch target
          // (CLAUDE.md §6, AC-WU-50) comes from an invisible ::before
          // overlay (INTERACTIVE_CHIP_CLASS) instead of growing the chip.
          <Badge
            asChild
            key={key}
            className={`${CHIP_CLASS} ${INTERACTIVE_CHIP_CLASS}`}
          >
            <button type="button" aria-label={`Modifier ou retirer l'affectation ${label}`} onClick={() => onSelectAssignment(assignment)}>
              {label}
            </button>
          </Badge>
        )
      })}
    </div>
  )
}
