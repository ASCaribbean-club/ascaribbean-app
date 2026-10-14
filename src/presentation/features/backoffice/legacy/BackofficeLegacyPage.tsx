import type { LegacyPointsMode } from '@domain/entities/legacy'
import { IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Label } from '@presentation/shared/components/ui/label'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@presentation/shared/components/ui/tabs'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { LegacyPointsTab } from './components/LegacyPointsTab'
import { LegacyRulesTab } from './components/LegacyRulesTab'
import { LegacyTiersTable } from './components/LegacyTiersTable'
import { useBackofficeLegacyViewModel } from './useBackofficeLegacyViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'legacy')!

// docs/specs/asc-legacy.md §6.4 — the paliers are one club-wide ladder: saving
// writes them to the current season and every future one, while past seasons
// keep theirs (so a tier already reached never changes retroactively). The
// season selector only picks which season's tiers and points mode are shown.
// Zero business logic: every branch is a boolean the ViewModel computed.
export function BackofficeLegacyPage() {
  const vm = useBackofficeLegacyViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex flex-col gap-1.5">
        <h2 className="text-xl font-bold text-foreground">ASC Legacy</h2>
      </div>

      <Tabs defaultValue="points" className="gap-6">
        <TabsList>
          <TabsTrigger value="points">Points attribués</TabsTrigger>
          <TabsTrigger value="tiers">Paliers</TabsTrigger>
          <TabsTrigger value="rules">Référentiel</TabsTrigger>
        </TabsList>

        <TabsContent value="points">
          <LegacyPointsTab />
        </TabsContent>

        <TabsContent value="tiers" className="flex flex-col gap-6">
          <p className="max-w-3xl text-sm text-muted-foreground">
            Les paliers sont les mêmes pour toutes les saisons. Une modification s’applique à la saison en cours et aux saisons à venir ;
            les saisons passées gardent leurs paliers. Le mode de points se règle dans l’onglet Saisons.
          </p>

          {vm.error && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.error.message}</AlertDescription>
            </Alert>
          )}

          {!vm.isLoading && !vm.error && vm.selectedSeasonId === null && (
            <BackofficeEmptyState icon={navItem.icon} title="Aucune saison : créez-en une dans l’onglet Saisons" />
          )}

          {vm.selectedSeasonId !== null && (
            <>
              <div className="flex flex-wrap items-end gap-6">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="legacy-season" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Saison
                  </Label>
                  <Select value={vm.selectedSeasonId} onValueChange={vm.selectSeason}>
                    <SelectTrigger id="legacy-season" className="h-11 w-56 min-w-0 rounded-xl">
                      <SelectValue />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.seasons.map((season) => (
                        <SelectItem key={season.id} value={season.id}>
                          {season.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label htmlFor="legacy-mode" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                    Mode de points
                  </Label>
                  <Select
                    value={vm.mode ?? ''}
                    onValueChange={(value) => vm.setMode(value as LegacyPointsMode)}
                    disabled={!vm.isEditable || vm.isSavingMode}
                  >
                    <SelectTrigger id="legacy-mode" className="h-11 w-64 min-w-0 rounded-xl">
                      <SelectValue placeholder="Non configuré" />
                    </SelectTrigger>
                    <SelectContent>
                      {vm.modeOptions.map((option) => (
                        <SelectItem key={option.value} value={option.value}>
                          {option.label}
                        </SelectItem>
                      ))}
                    </SelectContent>
                  </Select>
                </div>
              </div>

              {vm.modeErrorMessage && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{vm.modeErrorMessage}</AlertDescription>
                </Alert>
              )}
              {!vm.isModeConfigured && (
                <Alert>
                  <AlertDescription>Sans mode de points, l’ASC Legacy n’est pas affiché aux joueurs pour cette saison.</AlertDescription>
                </Alert>
              )}

              {vm.isReadOnlyPastSeason && (
                <Alert>
                  <AlertDescription>Saison passée : ses paliers sont affichés en lecture seule.</AlertDescription>
                </Alert>
              )}

              {vm.saveErrorMessage && (
                <Alert variant="destructive" role="alert">
                  <AlertDescription>{vm.saveErrorMessage}</AlertDescription>
                </Alert>
              )}
              {vm.savedSeasonCount !== null && (
                <Alert role="status">
                  <AlertDescription>
                    Paliers enregistrés pour {vm.savedSeasonCount} saison
                    {vm.savedSeasonCount > 1 ? 's' : ''} (en cours et à venir).
                  </AlertDescription>
                </Alert>
              )}

              <LegacyTiersTable rows={vm.rows} editable={vm.isEditable} onChange={vm.updateRow} />

              {vm.isEditable && (
                <div className="flex flex-wrap items-center gap-3">
                  <Button type="button" variant="outline" onClick={vm.addTier} disabled={vm.isSaving} className="h-11 rounded-full">
                    <IconPlus className="size-4" aria-hidden />
                    Ajouter un palier
                  </Button>
                  <div className="ml-auto flex items-center gap-3">
                    {vm.isDirty && (
                      <Button type="button" variant="outline" onClick={vm.discard} disabled={vm.isSaving} className="h-11 rounded-full">
                        Annuler
                      </Button>
                    )}
                    <Button
                      type="button"
                      onClick={vm.save}
                      disabled={!vm.canSave}
                      className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
                    >
                      {vm.isSaving ? 'Enregistrement…' : 'Enregistrer'}
                    </Button>
                  </div>
                </div>
              )}
            </>
          )}
        </TabsContent>

        <TabsContent value="rules">
          <LegacyRulesTab />
        </TabsContent>
      </Tabs>
    </div>
  )
}
