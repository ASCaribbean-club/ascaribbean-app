import { IconPlus } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { BACKOFFICE_NAV_ITEMS } from '@presentation/features/backoffice/backoffice-nav'
import { BackofficeEmptyState } from '@presentation/features/backoffice/components/BackofficeEmptyState'
import { AssignCoachDialog } from './components/AssignCoachDialog'
import { TeamFormDialog } from './components/TeamFormDialog'
import { TeamTable } from './components/TeamTable'
import { TeamTableSkeleton } from './components/TeamTableSkeleton'
import { useBackofficeTeamsViewModel } from './useBackofficeTeamsViewModel'

const navItem = BACKOFFICE_NAV_ITEMS.find((item) => item.id === 'teams')!

// specs/section-and-teams.md UI design, "Écran « Équipes »" — replaces
// nothing (BackofficeTeamsPage is a NEW screen, §1 "Note de cadrage"/UI
// design "Décision de routage": a distinct nav entry, not a tab of
// /admin/sections). Zero business logic here (CLAUDE.md §4/§6): every `if`
// below branches on a boolean the ViewModel already computed.
export function BackofficeTeamsPage() {
  const vm = useBackofficeTeamsViewModel()

  return (
    <div className="flex flex-1 flex-col gap-6">
      <div className="flex items-center justify-between gap-4">
        <h2 className="text-xl font-bold text-foreground">Équipes</h2>
        {/* AC-ST-20 — rendered only if canWriteTeams, never grayed out: "une
            carte disparaît, elle n'apparaît pas désactivée". */}
        {vm.canWriteTeams && (
          <Button
            type="button"
            onClick={vm.openCreateDialog}
            className="h-11 rounded-full bg-coach-green px-4 font-bold text-white hover:bg-coach-green"
          >
            <IconPlus className="size-4" aria-hidden />
            Équipe
          </Button>
        )}
      </div>

      {/* §7/AC-ST-44 — three filters side by side, each needs `min-w-0`
          (CLAUDE.md §6): even on a desktop-only screen, the window can be
          resized down to RequireDesktopViewport's floor, and three
          SelectTrigger without it would overlap the same way a mobile
          Date/Heure pair would. */}
      <div className="flex flex-wrap gap-3">
        <div className="min-w-[200px] flex-1 min-w-0">
          <Select value={vm.sectionFilter} onValueChange={vm.setSectionFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Toutes les sections" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les sections</SelectItem>
              {vm.sections.map((section) => (
                <SelectItem key={section.id} value={section.id}>
                  {section.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[200px] flex-1 min-w-0">
          <Select value={vm.seasonFilter} onValueChange={vm.setSeasonFilter}>
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Toutes les saisons" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Toutes les saisons</SelectItem>
              {vm.seasons.map((season) => (
                <SelectItem key={season.id} value={season.id}>
                  {season.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="min-w-[200px] flex-1 min-w-0">
          {/* AC-ST-44 — "avec/sans coach" answers the exact same source as
              the COACH(S) column, never a second calculation (see
              useBackofficeTeamsViewModel's own comment on this filter). */}
          <Select
            value={vm.coachFilter}
            onValueChange={(value) => vm.setCoachFilter(value as typeof vm.coachFilter)}
          >
            <SelectTrigger className="h-11 w-full rounded-xl">
              <SelectValue placeholder="Avec ou sans coach" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">Avec ou sans coach</SelectItem>
              <SelectItem value="with">Avec coach</SelectItem>
              <SelectItem value="without">Sans coach</SelectItem>
            </SelectContent>
          </Select>
        </div>
      </div>

      {vm.isLoading && <TeamTableSkeleton />}

      {!vm.isLoading && vm.error && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.error.message}</AlertDescription>
        </Alert>
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && vm.isFilterActive && (
        <BackofficeEmptyState
          icon={navItem.icon}
          title="Aucune équipe ne correspond à ce filtre"
          description="Réinitialisez les filtres pour voir toutes les équipes."
        />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length === 0 && !vm.isFilterActive && (
        <BackofficeEmptyState icon={navItem.icon} title={navItem.emptyStateTitle} />
      )}

      {!vm.isLoading && !vm.error && vm.rows.length > 0 && (
        <TeamTable
          rows={vm.rows}
          canWriteTeams={vm.canWriteTeams}
          canAssignCoach={vm.canAssignCoach}
          onEdit={vm.openEditDialog}
          onAssignCoach={vm.openAssignCoachDialog}
        />
      )}

      <TeamFormDialog dialog={vm.dialog} onClose={vm.closeDialog} />
      <AssignCoachDialog targetTeam={vm.assignCoachTarget} onClose={vm.closeAssignCoachDialog} />
    </div>
  )
}
