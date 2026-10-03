import { IconInfoCircle, IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Popover, PopoverContent, PopoverTrigger } from '@presentation/shared/components/ui/popover'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { ArchiveMembershipDialog } from './components/ArchiveMembershipDialog'
import { MembershipFormDialog } from './components/MembershipFormDialog'
import { MembershipTable } from './components/MembershipTable'
import { MembershipTableSkeleton } from './components/MembershipTableSkeleton'
import { MembershipUserFilterBanner } from './components/MembershipUserFilterBanner'
import { RecordPaymentDialog } from './components/RecordPaymentDialog'
import { useBackofficeMembershipsViewModel } from './useBackofficeMembershipsViewModel'
import { BackofficeFiltersToggle } from '@presentation/features/backoffice/components/BackofficeFiltersToggle'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'memberships')!

// specs/web-memberships.md — replaces the BackofficeEmptyState stub
// (§1, "cette tranche remplace le stub... qui rend aujourd'hui
// BackofficeEmptyState inconditionnellement"): /admin/memberships is now the
// memberships + cotisation write console (AC-WM-01 through AC-WM-33). Zero
// business logic here (CLAUDE.md §4/§6): every `if` below branches on a
// boolean the ViewModel already computed.
export function BackofficeMembershipsPage() {
  const vm = useBackofficeMembershipsViewModel()

  return (
    // min-h-0 + flex-1: the page is bounded by <main>'s height (the shell is
    // viewport-height), so only the table region below scrolls — title bar and
    // filters stay put.
    <div className="flex min-h-0 flex-1 flex-col gap-6">
      <div className="flex shrink-0 items-start justify-between gap-4">
        <div>
          {/* §1/§2.7 + AC-WM-36 — the two business rules (renewal = new row,
              "Active" activation rule) used to be two always-visible lines
              under the title; moved behind an info popover to save vertical
              space. Popover (click/tap), not Tooltip (hover): mobile-first
              rule, and keyboard-reachable. */}
          <div className="flex items-center gap-1">
            <h2 className="text-xl font-bold text-foreground">Adhésions</h2>
            <Popover>
              <PopoverTrigger asChild>
                <button
                  type="button"
                  aria-label="Règles des adhésions"
                  className="flex size-11 items-center justify-center rounded-full text-muted-foreground hover:text-foreground"
                >
                  <IconInfoCircle className="size-5" aria-hidden />
                </button>
              </PopoverTrigger>
              <PopoverContent align="start" className="w-80 text-sm text-muted-foreground">
                <p>Un renouvellement crée toujours une nouvelle ligne — l'historique par saison est conservé.</p>
                <p className="mt-2">Le statut « Active » exige une licence renseignée et une cotisation intégralement réglée.</p>
              </PopoverContent>
            </Popover>
          </div>
        </div>
        <div className="flex shrink-0 items-center gap-2">
          <BackofficeFiltersToggle isCollapsed={vm.areFiltersCollapsed} hasActiveFilters={vm.isFilterActive} onToggle={vm.toggleFiltersCollapsed} />
          {/* AC-WM-23 — rendered only if canWriteMembership, never grayed out. */}
          {vm.canWriteMembership && (
            <Button
              type="button"
              onClick={vm.openCreateDialog}
              className="h-11 shrink-0 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
            >
              <IconPlus className="size-4" aria-hidden />
              Nouvelle adhésion
            </Button>
          )}
        </div>
      </div>

      {/* §2/AC-WM-19 — three filters side by side, min-w-0 on each
          (CLAUDE.md §6, same piège already documented on NewsFormDialog and
          TeamTable's own three filters). */}
      {!vm.areFiltersCollapsed && (
        <div className="flex shrink-0 flex-wrap gap-3">
          <div className="min-w-[200px] flex-1 min-w-0">
            <Select value={vm.seasonFilter} onValueChange={vm.setSeasonFilter}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Toutes les saisons" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toutes les saisons</SelectItem>
                {vm.seasonOptions.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px] flex-1 min-w-0">
            <Select value={vm.statusFilter} onValueChange={(value) => vm.setStatusFilter(value as typeof vm.statusFilter)}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Tous les statuts" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Tous les statuts</SelectItem>
                <SelectItem value="pending">En attente</SelectItem>
                <SelectItem value="active">Active</SelectItem>
                <SelectItem value="suspended">Suspendue</SelectItem>
              </SelectContent>
            </Select>
          </div>

          <div className="min-w-[200px] flex-1 min-w-0">
            <Select value={vm.cotisationFilter} onValueChange={(value) => vm.setCotisationFilter(value as typeof vm.cotisationFilter)}>
              <SelectTrigger className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Toute cotisation" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">Toute cotisation</SelectItem>
                <SelectItem value="unpaid">Non payé</SelectItem>
                <SelectItem value="partial">Partiel</SelectItem>
                <SelectItem value="paid">Payé</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
      )}

      {/* specs/web-users-membership-column.md §2.3b — rendered ONLY when
          the ?user= URL param is present; absent, nothing here changes
          from before this amendment (AC-WU-58). */}
      {vm.userFilter && <MembershipUserFilterBanner accountName={vm.filteredUserName} onReset={vm.clearUserFilter} />}

      {/* §2.6c/AC-WM-21 — explicit fallback banner, never a silently empty
          list, when no season is currently in progress. */}
      {vm.noCurrentSeason && <p className="text-sm text-muted-foreground">Aucune saison n'est actuellement en cours — toutes les saisons sont affichées.</p>}

      <div className="flex min-h-0 flex-1 flex-col gap-6 overflow-y-auto no-scrollbar">
        {vm.isLoading && <MembershipTableSkeleton />}

        {!vm.isLoading && vm.error && (
          <Alert variant="destructive" role="alert">
            <AlertDescription>{vm.error.message}</AlertDescription>
          </Alert>
        )}

        {!vm.isLoading && !vm.error && vm.rows.length === 0 && vm.isFilterActive && (
          <BackofficeEmptyState
            icon={navItem.icon}
            title="Aucune adhésion ne correspond à ces filtres"
            description="Réinitialisez les filtres pour voir toutes les adhésions."
          />
        )}

        {!vm.isLoading && !vm.error && vm.rows.length === 0 && !vm.isFilterActive && (
          <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
        )}

        {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
          <MembershipTable
            rows={vm.rows}
            users={vm.users}
            canWriteMembership={vm.canWriteMembership}
            canRecordPayment={vm.canRecordPayment}
            expandedMembershipId={vm.expandedMembershipId}
            onToggleEdit={vm.toggleEditRow}
            onCollapseEdit={vm.collapseEditRow}
            onRecordPayment={vm.openPaymentDialog}
            onArchive={vm.requestArchive}
          />
        )}
      </div>

      <MembershipFormDialog isOpen={vm.isCreateDialogOpen} presetUserId={vm.createDialogPresetUserId} onClose={vm.closeCreateDialog} />
      <RecordPaymentDialog target={vm.paymentTarget} onClose={vm.closePaymentDialog} />
      <ArchiveMembershipDialog
        target={vm.pendingArchive}
        paidCents={vm.archiveTargetPaidCents}
        isArchiving={vm.isArchiving}
        errorMessage={vm.archiveErrorMessage}
        onConfirm={vm.confirmArchive}
        onCancel={vm.cancelArchive}
      />
    </div>
  )
}
