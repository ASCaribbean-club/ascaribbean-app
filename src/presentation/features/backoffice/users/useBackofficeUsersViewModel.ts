import { useState } from 'react'
import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { AssignableRoleAssignment, Role } from '@domain/entities/user'
import { userStatus, type UserStatus } from '@domain/policies/user-status'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import type { EditRoleAssignmentTarget } from './components/EditRoleAssignmentDialog'
import type { InviteUserDialogTarget } from './useInviteUserDialogViewModel'

export type UserRoleFilterValue = Role | 'all'
export type UserStatusFilterValue = UserStatus | 'all'

// specs/web-users.md §2.2/§2.10/AC-WU-11/AC-WU-20 — /admin/users' own read,
// composed directly here (userRepository.findAdminDirectory(), .findAll()
// is NOT called — that narrower method still backs AssignCoachDialog/
// MembershipFormDialog's own dropdown, untouched, AC-WU-11). No wrapping
// use case for this plain read (same "RLS is the sole authority on what
// comes back" precedent as useBackofficeMembershipsViewModel/
// useBackofficeTeamsViewModel) — the WRITES (invite/rename/assign role) each
// go through their own use case, wired via useUsersDependencies and
// consumed by this screen's dialogs (InviteUserDialog, UserEditDialog,
// AssignRoleDialog), never here directly.
export function useBackofficeUsersViewModel() {
  const navigate = useNavigate()
  const { userRepository, teamRepository, sectionRepository, seasonRepository } = useUsersDependencies()

  // §3/UI design "Ce qui change par rôle" — three independent booleans,
  // never collapsed into one generic canManageUsers (AC-WU-19): a future
  // widening of only one of these actions must not silently unlock the
  // other two. `canWriteMembership` no longer belongs here — its only
  // consumer, the "Adhésion" row button, is retired
  // (specs/web-users-membership-column.md §2.4, AC-WU-56): this screen no
  // longer consumes 'membership:write' at all.
  const canInviteUser = usePermission('user:invite')
  const canWriteUser = usePermission('user:write')
  const canAssignRole = usePermission('role:assign')

  const [search, setSearch] = useState('')
  const [roleFilter, setRoleFilter] = useState<UserRoleFilterValue>('all')
  const [statusFilter, setStatusFilter] = useState<UserStatusFilterValue>('all')

  // specs/web-users-invitation-links.md §4 — one dialog target for both
  // modes (create from the header button, reissue from a row's "Lien
  // d'invitation" action) — null closes it, same shape as every other
  // dialog target in this ViewModel.
  const [inviteDialogTarget, setInviteDialogTarget] = useState<InviteUserDialogTarget | null>(null)
  const [editTarget, setEditTarget] = useState<AdminUserDirectoryEntry | null>(null)
  const [assignRoleTarget, setAssignRoleTarget] = useState<AdminUserDirectoryEntry | null>(null)
  // specs/web-users-role-edit-remove.md §2.1/UI design "La pastille de rôle
  // devient un contrôle" — opened by a click on a non-admin pastille in
  // UserRolesCell, closed by EditRoleAssignmentDialog itself (its own
  // Annuler, its own successful submit, or a successful removal).
  const [editRoleAssignmentTarget, setEditRoleAssignmentTarget] = useState<EditRoleAssignmentTarget | null>(null)

  // §2.3 "repli" — resolved once here, then threaded into BOTH
  // findAdminDirectory() (this hook) and CountUsersRequiringAttentionUseCase
  // (useUsersNavBadge's own, separate read) — never an error when no season
  // is current, criteria 2/3 simply come back false (§2.3).
  const currentSeasonQuery = useQuery({ queryKey: queryKeys.seasonCurrent(), queryFn: () => seasonRepository.findCurrent() })
  const currentSeasonId = currentSeasonQuery.data?.id ?? null

  const directoryQuery = useQuery({
    queryKey: queryKeys.usersAdminDirectory(),
    queryFn: () => userRepository.findAdminDirectory(currentSeasonId),
    enabled: currentSeasonQuery.isSuccess,
  })

  // §2.2 — team/section NAME resolution for the RÔLES column, composed from
  // the SAME centralized queryKeys useAssignCoachDialogViewModel already
  // warms (TanStack Query dedupes the request rather than firing a second
  // one).
  const teamsQuery = useQuery({ queryKey: queryKeys.teamsAdminList(), queryFn: () => teamRepository.findAllForAdmin() })
  const sectionsQuery = useQuery({ queryKey: queryKeys.sectionsAdminList(), queryFn: () => sectionRepository.findAll() })

  const isLoading = currentSeasonQuery.isLoading || directoryQuery.isLoading || teamsQuery.isLoading || sectionsQuery.isLoading
  const queryError = currentSeasonQuery.error ?? directoryQuery.error ?? teamsQuery.error ?? sectionsQuery.error
  const error = queryError ? mapDomainErrorToUiError(queryError) : null

  const entries = directoryQuery.data ?? []
  const teamsById = new Map((teamsQuery.data ?? []).map((team) => [team.id, team]))
  const sectionsById = new Map((sectionsQuery.data ?? []).map((section) => [section.id, section]))

  const normalizedSearch = search.trim().toLowerCase()
  const rows = entries.filter((entry) => {
    if (normalizedSearch && !entry.fullName.toLowerCase().includes(normalizedSearch) && !entry.email.toLowerCase().includes(normalizedSearch)) {
      return false
    }
    if (roleFilter !== 'all' && !entry.roles.some((assignment) => assignment.role === roleFilter)) return false
    if (statusFilter !== 'all' && userStatus(entry.charterAcceptedAt) !== statusFilter) return false
    return true
  })

  // UI design point 5 — "état résultat de filtre vide", distinct from the
  // normal empty-list state (same reasoning as useBackofficeMembershipsViewModel's
  // own isFilterActive).
  const isFilterActive = normalizedSearch !== '' || roleFilter !== 'all' || statusFilter !== 'all'

  // specs/web-users-membership-column.md §2.3a/AC-WU-58 — the ADHÉSION
  // SAISON column's own redirect control, for a non-member row: navigates
  // to /admin/memberships pre-filtered on this account's id (never its
  // name, §2.3a) via the router (no full page reload). This screen never
  // writes a membership itself anymore (§2.4) — it only ever hands off.
  function goToMembership(userId: string) {
    navigate(`/admin/memberships?user=${userId}`)
  }

  return {
    isLoading,
    error,
    rows,
    isFilterActive,

    canInviteUser,
    canWriteUser,
    canAssignRole,

    // §2.3d — the ADHÉSION SAISON column's third state ("aucune saison en
    // cours") needs to know this directly, the same currentSeasonId already
    // resolved above for findAdminDirectory() — no second read.
    currentSeasonId,
    goToMembership,

    teamsById,
    sectionsById,

    search,
    setSearch,
    roleFilter,
    setRoleFilter,
    statusFilter,
    setStatusFilter,

    inviteDialogTarget,
    openInviteDialog: () => setInviteDialogTarget({ mode: 'create' }),
    // specs/web-users-invitation-links.md §4 — the row action's own entry
    // point into the SAME dialog, re-issue mode. The row action's own
    // rendering condition (userStatus(row.charterAcceptedAt) === 'invited',
    // UserTable) already keeps this unreachable for a non-'invited' row —
    // this is just the target constructor, no second check duplicated
    // here (ARCHITECTURE.md §6, the ViewModel is the one place that
    // computes this).
    openReissueInvitationDialog: (row: AdminUserDirectoryEntry) => setInviteDialogTarget({ mode: 'reissue', userId: row.id, fullName: row.fullName }),
    closeInviteDialog: () => setInviteDialogTarget(null),

    editTarget,
    openEditDialog: (row: AdminUserDirectoryEntry) => setEditTarget(row),
    closeEditDialog: () => setEditTarget(null),

    assignRoleTarget,
    openAssignRoleDialog: (row: AdminUserDirectoryEntry) => setAssignRoleTarget(row),
    closeAssignRoleDialog: () => setAssignRoleTarget(null),

    editRoleAssignmentTarget,
    openEditRoleAssignmentDialog: (row: AdminUserDirectoryEntry, assignment: AssignableRoleAssignment) =>
      setEditRoleAssignmentTarget({ user: row, assignment }),
    closeEditRoleAssignmentDialog: () => setEditRoleAssignmentTarget(null),
  }
}
