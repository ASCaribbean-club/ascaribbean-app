import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { AuditLogFilters } from './components/AuditLogFilters'
import { AuditLogTable } from './components/AuditLogTable'
import { AuditLogTableSkeleton } from './components/AuditLogTableSkeleton'
import { useBackofficeAuditViewModel } from './useBackofficeAuditViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'audit')!

// specs/web-audit-logs.md — the 8th backoffice destination, `/admin/audit`.
// Zero business logic here (CLAUDE.md §4/§6): every `if` below branches on
// a boolean the ViewModel already computed.
export function BackofficeAuditPage() {
  const vm = useBackofficeAuditViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div>
        <h2 className="text-xl font-bold text-foreground">Journal d&rsquo;audit</h2>
        {/* UI design §"En-tête" — the mockup's own explanatory line, a
            statement of what this screen is (read-only), not a decoration.
            No "liste d'exemples" copied from the mockup's parenthetical
            (rôles, adhésions, paiements, données de santé) — that would
            promise codes this pass doesn't build (§2.2, AC-AU-18). */}
        <p className="mt-1 text-sm text-muted-foreground">Chaque action sensible est journalisée. Lecture seule.</p>
      </div>

      <AuditLogFilters
        fromDate={vm.fromDate}
        onFromDateChange={vm.setFromDate}
        toDate={vm.toDate}
        onToDateChange={vm.setToDate}
        selectedActions={vm.selectedActions}
        onToggleAction={vm.toggleAction}
        onSelectAllActions={vm.selectAllActions}
        onClearActions={vm.clearActions}
      />

      {vm.isLoading && <AuditLogTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {/* AC-AU-18(a) — nominal empty state for this pass: zero emitters
          exist yet, so the table is empty and stays empty until a future
          pass builds one. */}
      {vm.isEmpty && <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />}

      {/* AC-AU-18(b) — a DIFFERENT message than (a), with an obvious way
          back to the unfiltered list. */}
      {vm.isEmptyFiltered && (
        <BackofficeEmptyState icon={navItem.icon} title="Aucune entrée pour ces filtres">
          <Button type="button" variant="ghost" onClick={vm.resetFilters} className="h-11 rounded-full">
            Réinitialiser les filtres
          </Button>
        </BackofficeEmptyState>
      )}

      {!vm.isLoading && !vm.error && vm.entries.length > 0 && (
        <>
          <AuditLogTable entries={vm.entries} />

          {/* §2.6/AC-AU-13 — "charger plus" button: present with a live
              label while a next page can exist, replaced by a "Chargement…"
              disabled state mid-fetch, and simply ABSENT (not disabled) once
              the last page came back short of the page size — never a
              numbered pager, never implicit infinite scroll. */}
          {vm.hasMore && (
            <div className="flex justify-center">
              <Button type="button" variant="outline" disabled={vm.isFetchingNextPage} onClick={vm.loadMore} className="h-11 rounded-full">
                {vm.isFetchingNextPage ? 'Chargement…' : 'Charger plus'}
              </Button>
            </div>
          )}
        </>
      )}
    </div>
  )
}
