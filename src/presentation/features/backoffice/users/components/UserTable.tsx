import { IconKey, IconLink, IconPencil } from '@tabler/icons-react'
import type { Section } from '@domain/entities/section'
import type { Team } from '@domain/entities/team'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import { userStatus } from '@domain/policies/user-status'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { Button } from '@presentation/shared/components/ui/button'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import { UserMembershipSeasonCell } from './UserMembershipSeasonCell'
import { UserMissingElementIndicator } from './UserMissingElementIndicator'
import { UserRolesCell } from './UserRolesCell'
import { UserStatusBadge } from './UserStatusBadge'

interface UserTableProps {
  rows: AdminUserDirectoryEntry[]
  teamsById: Map<string, Team>
  sectionsById: Map<string, Section>
  // specs/web-users-membership-column.md §2.3d — the ADHÉSION SAISON
  // column's third state, resolved once by the ViewModel (the same
  // currentSeasonId findAdminDirectory() itself was called with), never
  // re-derived here.
  currentSeasonId: string | null
  canAssignRole: boolean
  canWriteUser: boolean
  onAssignRole: (row: AdminUserDirectoryEntry) => void
  // specs/web-users-membership-column.md §2.3a — the new column's own
  // redirect control, for a non-member row only. Lives in the ADHÉSION
  // SAISON cell, never in ACTIONS (AC-WU-56).
  onGoToMembership: (userId: string) => void
  onEdit: (row: AdminUserDirectoryEntry) => void
  // specs/web-users-role-edit-remove.md §2.1/UI design "La pastille de rôle
  // devient un contrôle" — a click on a non-admin pastille, the row it
  // belongs to AND the exact assignment (natural key) it targets.
  onSelectRoleAssignment: (row: AdminUserDirectoryEntry, assignment: AssignableRoleAssignment) => void
  // specs/web-users-invitation-links.md §4 "Users list — new row action" —
  // a boolean the ViewModel already computed (usePermission('user:invite')),
  // combined HERE with each row's own userStatus() (the SAME predicate
  // UserStatusBadge already renders from) — never a stored/passed-in
  // per-row boolean, so there is exactly one place this rule is expressed.
  canReissueInvitation: boolean
  onReissueInvitation: (row: AdminUserDirectoryEntry) => void
  // specs/web-users-invitation-links.md §4 (amendement — password reset is
  // admin-mediated) — mirror image of canReissueInvitation/onReissueInvitation
  // above: same boolean the ViewModel already computed
  // (usePermission('user:invite')), combined HERE with each row's own
  // userStatus() being 'active' rather than 'invited'.
  canGeneratePasswordResetLink: boolean
  onGeneratePasswordResetLink: (row: AdminUserDirectoryEntry) => void
}

// specs/web-users.md §1/UI design "Tableau à six colonnes"
// (specs/web-users-membership-column.md amendment) — exact order: NOM,
// EMAIL, STATUT, RÔLES, ADHÉSION SAISON, ACTIONS. The new column sits
// between RÔLES and ACTIONS, never between NOM and STATUT (it would be
// visually confused with the activation pastille there).
export function UserTable({
  rows,
  teamsById,
  sectionsById,
  currentSeasonId,
  canAssignRole,
  canWriteUser,
  onAssignRole,
  onGoToMembership,
  onEdit,
  onSelectRoleAssignment,
  canReissueInvitation,
  onReissueInvitation,
  canGeneratePasswordResetLink,
  onGeneratePasswordResetLink,
}: UserTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Nom</TableHead>
          <TableHead>Email</TableHead>
          <TableHead>Statut</TableHead>
          <TableHead>Rôles</TableHead>
          <TableHead>Adhésion saison</TableHead>
          {/* No visible label in the mockup for this column — sr-only text
              on an inner <span>, same reasoning as NewsTable/MembershipTable
              (sr-only on the <th> itself would collapse the cell out of the
              table's column layout). */}
          <TableHead>
            <span className="sr-only">Actions</span>
          </TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.id}>
            <TableCell className="font-semibold">
              {/* §2.3/UI design "Icône d'avertissement de ligne" — the
                  warning icon lives HERE, in the NOM cell, not in the RÔLES
                  cell (which only ever renders what it's given, §2.2). */}
              <div className="flex min-w-0 items-center gap-1.5">
                <span className="truncate">{row.fullName}</span>
                <UserMissingElementIndicator facts={row.missingElementFacts} />
              </div>
            </TableCell>
            <TableCell className="text-muted-foreground">{row.email}</TableCell>
            <TableCell>
              <UserStatusBadge charterAcceptedAt={row.charterAcceptedAt} />
            </TableCell>
            <TableCell>
              <UserRolesCell
                roles={row.roles}
                teamsById={teamsById}
                sectionsById={sectionsById}
                canAssignRole={canAssignRole}
                onSelectAssignment={(assignment) => onSelectRoleAssignment(row, assignment)}
              />
            </TableCell>
            <TableCell>
              <UserMembershipSeasonCell
                hasMembershipForCurrentSeason={row.missingElementFacts.hasMembershipForCurrentSeason}
                currentSeasonId={currentSeasonId}
                fullName={row.fullName}
                onRedirect={() => onGoToMembership(row.id)}
              />
            </TableCell>
            <TableCell>
              <div className="flex min-w-0 items-center gap-1">
                {/* §1/AC-WU-19 — rendered only if the corresponding
                    ViewModel boolean is true, never grayed out. Text-only
                    buttons (no icon), same as the mockup. */}
                {canAssignRole && (
                  <Button type="button" variant="outline" onClick={() => onAssignRole(row)} className="h-11 rounded-full">
                    + Rôle
                  </Button>
                )}
                {canWriteUser && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Modifier « ${row.fullName} »`}
                    onClick={() => onEdit(row)}
                    className="h-11 w-11 rounded-full"
                  >
                    <IconPencil className="size-4" aria-hidden />
                  </Button>
                )}
                {/* specs/web-users-invitation-links.md §4 — rendered only
                    for a still-'invited' row, never a disabled button for
                    any other status (least-privilege display rule, same as
                    every other action in this cell). */}
                {canReissueInvitation && userStatus(row.charterAcceptedAt) === 'invited' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Lien d’invitation pour « ${row.fullName} »`}
                    onClick={() => onReissueInvitation(row)}
                    className="h-11 w-11 rounded-full"
                  >
                    <IconLink className="size-4" aria-hidden />
                  </Button>
                )}
                {/* specs/web-users-invitation-links.md §4 (amendement) —
                    mirror image of the reissue button above: rendered only
                    for an 'active' row, never a disabled button for a still-
                    'invited' one (it has no password yet to reset). */}
                {canGeneratePasswordResetLink && userStatus(row.charterAcceptedAt) === 'active' && (
                  <Button
                    type="button"
                    variant="outline"
                    size="icon"
                    aria-label={`Réinitialiser le mot de passe de « ${row.fullName} »`}
                    onClick={() => onGeneratePasswordResetLink(row)}
                    className="h-11 w-11 rounded-full"
                  >
                    <IconKey className="size-4" aria-hidden />
                  </Button>
                )}
              </div>
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
