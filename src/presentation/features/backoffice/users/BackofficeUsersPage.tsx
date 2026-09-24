import { IconPlus } from '@tabler/icons-react'
import type { UserRoleFilterValue, UserStatusFilterValue } from './useBackofficeUsersViewModel'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Input } from '@presentation/shared/components/ui/input'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { formatRole } from '@presentation/shared/formatters/role-labels'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { AssignRoleDialog } from './components/AssignRoleDialog'
import { EditRoleAssignmentDialog } from './components/EditRoleAssignmentDialog'
import { InviteUserDialog } from './components/InviteUserDialog'
import { UserEditDialog } from './components/UserEditDialog'
import { UserTable } from './components/UserTable'
import { UserTableSkeleton } from './components/UserTableSkeleton'
import { useBackofficeUsersViewModel } from './useBackofficeUsersViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'users')!

// specs/web-users.md — replaces the BackofficeEmptyState stub (§1, "cette
// tranche remplace le stub... qui rend aujourd'hui BackofficeEmptyState
// inconditionnellement"): /admin/users is now the account/role console
// (AC-WU-01 through AC-WU-39). Zero business logic here (CLAUDE.md §4/§6):
// every `if`/conditional render below branches on a boolean or value the
// ViewModel already computed.
export function BackofficeUsersPage() {
  const vm = useBackofficeUsersViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-start justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">Utilisateurs</h2>
        {/* AC-WU-19 — rendered only if canInviteUser, never grayed out. */}
        {vm.canInviteUser && (
          <Button
            type="button"
            onClick={vm.openInviteDialog}
            className="h-11 shrink-0 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
          >
            <IconPlus className="size-4" aria-hidden />
            Inviter un utilisateur
          </Button>
        )}
      </div>

      {/* §1/UI design "Écran liste" — search + two filters side by side,
          each h-11, each min-w-0 (CLAUDE.md §6, same piège already
          documented on NewsFormDialog/TeamTable's own filters). */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[240px] flex-[2] min-w-0">
          <Input
            type="search"
            placeholder="Rechercher par nom ou email…"
            value={vm.search}
            onChange={(event) => vm.setSearch(event.target.value)}
            className="h-11 rounded-xl"
            aria-label="Rechercher par nom ou email"
          />
        </div>

        <div className="min-w-[200px] flex-1 min-w-0">
          <Select value={vm.roleFilter} onValueChange={(value) => vm.setRoleFilter(value as UserRoleFilterValue)}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Tous les rôles" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Tous les rôles</SelectItem>
              {ALL_ROLES.map((role) => (
                <SelectItem key={role} value={role}>
                  {formatRole(role)}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[200px] flex-1 min-w-0">
          <Select value={vm.statusFilter} onValueChange={(value) => vm.setStatusFilter(value as UserStatusFilterValue)}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Tous les statuts" />
            </SelectTrigger>
            <SelectContent>
              {/* AC-WU-09 — exactly the two values of the status predicate,
                  never Suspendu/Désactivé. */}
              <SelectItem value="all">Tous les statuts</SelectItem>
              <SelectItem value="invited">Invité</SelectItem>
              <SelectItem value="active">Actif</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {vm.isLoading && <UserTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && vm.isFilterActive && (
        <BackofficeEmptyState
          icon={navItem.icon}
          title="Aucun utilisateur ne correspond à ces critères"
          description="Réinitialisez la recherche ou les filtres pour voir tous les utilisateurs."
        />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && !vm.isFilterActive && (
        <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <UserTable
          rows={vm.rows}
          teamsById={vm.teamsById}
          sectionsById={vm.sectionsById}
          currentSeasonId={vm.currentSeasonId}
          canAssignRole={vm.canAssignRole}
          canWriteUser={vm.canWriteUser}
          onAssignRole={vm.openAssignRoleDialog}
          onGoToMembership={vm.goToMembership}
          onEdit={vm.openEditDialog}
          onSelectRoleAssignment={vm.openEditRoleAssignmentDialog}
          canReissueInvitation={vm.canInviteUser}
          onReissueInvitation={vm.openReissueInvitationDialog}
          canGeneratePasswordResetLink={vm.canInviteUser}
          onGeneratePasswordResetLink={vm.openPasswordResetDialog}
        />
      )}

      <InviteUserDialog target={vm.inviteDialogTarget} onClose={vm.closeInviteDialog} />
      <UserEditDialog target={vm.editTarget} onClose={vm.closeEditDialog} />
      <AssignRoleDialog target={vm.assignRoleTarget} onClose={vm.closeAssignRoleDialog} />
      <EditRoleAssignmentDialog
        target={vm.editRoleAssignmentTarget}
        teamsById={vm.teamsById}
        sectionsById={vm.sectionsById}
        onClose={vm.closeEditRoleAssignmentDialog}
      />
    </div>
  )
}

// §1/UI design "Filtre RÔLE" — les huit rôles via formatRole() (jamais une
// septième/huitième liste redupliquée), + l'option par défaut. Distinct de
// la liste des sept rôles assignables d'AssignRoleDialog (celle-là exclut
// 'admin', §2.6a) : ce filtre, lui, doit pouvoir retrouver une ligne
// administrateur dans le tableau.
const ALL_ROLES: Exclude<UserRoleFilterValue, 'all'>[] = [
  'player',
  'coach',
  'section-manager',
  'authorized-officer',
  'treasurer',
  'medical-referent',
  'volunteer',
  'admin',
]
