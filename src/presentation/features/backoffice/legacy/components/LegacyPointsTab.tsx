import { IconPlus } from '@tabler/icons-react'
import type { LedgerAction, LedgerAttribution } from '@domain/policies/legacy-ledger'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { useLegacyPointsViewModel } from '../useLegacyPointsViewModel'
import { AwardPointsDialog } from './AwardPointsDialog'
import { LegacyKpiCards } from './LegacyKpiCards'
import { LegacyLedgerTable } from './LegacyLedgerTable'

// Radix Select cannot carry an empty value: "no filter" is this sentinel.
const ALL = 'all'
const LABEL = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase'

// "Points attribués" tab — the actions that produced points, filterable by
// player, action and attribution, with key indicators; the FAB awards a manual
// action to a player. Zero business logic: branches on ViewModel booleans only.
export function LegacyPointsTab() {
  const vm = useLegacyPointsViewModel()

  if (vm.isLoading) return <Skeleton className="h-96 rounded-xl" />

  if (vm.error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{vm.error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-6 pb-24">
      <LegacyKpiCards kpis={vm.kpis} />

      <div className="flex flex-wrap items-end gap-4">
        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="ledger-player" className={LABEL}>
            Joueur
          </Label>
          <Select value={vm.filters.userId ?? ALL} onValueChange={(value) => vm.setUserFilter(value === ALL ? null : value)}>
            <SelectTrigger id="ledger-player" className="h-11 w-56 min-w-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Tous les joueurs</SelectItem>
              {vm.players.map((player) => (
                <SelectItem key={player.id} value={player.id}>
                  {player.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="ledger-action" className={LABEL}>
            Action
          </Label>
          <Select
            value={vm.filters.action ?? ALL}
            onValueChange={(value) => vm.setActionFilter(value === ALL ? null : (value as LedgerAction))}
          >
            <SelectTrigger id="ledger-action" className="h-11 w-64 min-w-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes les actions</SelectItem>
              {vm.actionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex min-w-0 flex-col gap-1.5">
          <Label htmlFor="ledger-attribution" className={LABEL}>
            Attribution
          </Label>
          <Select
            value={vm.filters.attribution ?? ALL}
            onValueChange={(value) => vm.setAttributionFilter(value === ALL ? null : (value as LedgerAttribution))}
          >
            <SelectTrigger id="ledger-attribution" className="h-11 w-48 min-w-0 rounded-xl">
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Toutes</SelectItem>
              {vm.attributionOptions.map((option) => (
                <SelectItem key={option.value} value={option.value}>
                  {option.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        {vm.hasActiveFilters && (
          <Button type="button" variant="outline" onClick={vm.resetFilters} className="h-11 rounded-full">
            Réinitialiser
          </Button>
        )}
      </div>

      {vm.totalCount === 0 ? (
        <p className="rounded-2xl border border-dashed p-6 text-center text-sm text-muted-foreground">
          {vm.hasActiveFilters ? 'Aucune attribution ne correspond à ces filtres.' : 'Aucun point attribué pour l’instant.'}
        </p>
      ) : (
        <LegacyLedgerTable rows={vm.rows} expandedId={vm.expandedId} onToggle={vm.toggleExpanded} />
      )}

      {vm.hasMore && (
        <Button type="button" variant="outline" onClick={vm.showMore} className="h-11 self-center rounded-full">
          Voir plus
        </Button>
      )}

      {/* FAB — absent, never greyed out, without 'legacy:award'. Rendered inside
          this tab only, so it never floats over Paliers / Référentiel. */}
      {vm.canAward && (
        <Button
          type="button"
          onClick={vm.openAwardDialog}
          aria-label="Attribuer des points"
          className="fixed right-8 bottom-8 z-20 size-14 rounded-full bg-coach-green text-white shadow-[0_8px_20px_rgba(0,0,0,0.4)] hover:bg-coach-green/90"
        >
          <IconPlus className="size-6" aria-hidden />
        </Button>
      )}

      <AwardPointsDialog open={vm.isAwardDialogOpen} players={vm.players} rules={vm.rules} onClose={vm.closeAwardDialog} />
    </div>
  )
}
