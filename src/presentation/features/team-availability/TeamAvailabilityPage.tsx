import { IconUsers } from '@tabler/icons-react'
import { Navigate } from 'react-router-dom'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { Button } from '@presentation/shared/components/ui/button'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { AvailabilityEditSheet } from './components/AvailabilityEditSheet'
import { AvailabilityCountTiles } from './components/AvailabilityCountTiles'
import { AvailabilityFiltersPanel } from './components/AvailabilityFiltersPanel'
import { AvailabilityListSkeleton } from './components/AvailabilityListSkeleton'
import { AvailabilityRow } from './components/AvailabilityRow'
import { useTeamAvailabilityViewModel } from './useTeamAvailabilityViewModel'

// specs/player-unavailability.md UI design §2/§5 — zero business logic: only
// the isLoading/error/canX branches the ViewModel already computed. Bottom
// nav is deliberately absent: this is a pushed route (see router.tsx).
export function TeamAvailabilityPage() {
  const vm = useTeamAvailabilityViewModel()

  // Not allowed (other role, or no team): the screen is absent, not greyed out.
  if (!vm.canReadTeam) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen flex-col bg-coach-bg text-white">
      <BackHeader title={vm.title} subtitle={vm.subtitle} onBack={vm.goBack} />

      <div className="flex flex-1 flex-col gap-4 px-5.5 pt-2 pb-10">
        {vm.hasFilters && (
          <AvailabilityFiltersPanel
            isExpanded={vm.areFiltersVisible}
            onToggle={vm.toggleFilters}
            activeFiltersSummary={vm.activeFiltersSummary}
            isOfficerView={vm.isOfficerView}
            sections={vm.sections}
            areSectionsLoading={vm.areSectionsLoading}
            selectedSectionId={vm.selectedSectionId}
            onSelectSection={vm.onSelectSection}
            teamOptions={vm.teamOptions}
            selectedTeamId={vm.selectedTeamId}
            onSelectTeam={vm.onSelectTeam}
            canFilterStatus={vm.canFilterStatus}
            chips={vm.chips}
            filter={vm.filter}
            onFilterChange={vm.onFilterChange}
          />
        )}

        {vm.needsTeamSelection ? (
          <p className="py-8 text-center text-[14px] text-white/60">
            {vm.needsSectionSelection ? 'Choisissez une section, puis une équipe.' : 'Choisissez une équipe.'}
          </p>
        ) : vm.isLoading ? (
          <AvailabilityListSkeleton />
        ) : vm.error ? (
          <div role="alert" className="flex flex-col items-center gap-4 py-16 text-center">
            <p className="text-[14.5px] font-semibold text-white/70">Impossible de charger les disponibilités.</p>
            <Button type="button" variant="outline" onClick={vm.refetch} className="h-11 rounded-full border-white/15 bg-transparent px-6 text-white">
              Réessayer
            </Button>
          </div>
        ) : vm.isRosterEmpty ? (
          <EmptyState icon={IconUsers} message="Aucun joueur dans cette équipe" />
        ) : (
          <>
            <AvailabilityCountTiles counts={vm.counts} outLabel={vm.outLabel} />
            {vm.isFilterEmpty ? (
              <p className="py-8 text-center text-[14px] text-white/60">Aucun joueur dans cette catégorie</p>
            ) : (
              <ul className="flex flex-col gap-2.5">
                {vm.rows.map((row) => (
                  <AvailabilityRow key={row.userId} row={row} onSelect={vm.isRowEditable(row) ? () => vm.openEditor(row) : undefined} />
                ))}
              </ul>
            )}
          </>
        )}
      </div>

      {vm.editingRow && vm.teamId && (
        <AvailabilityEditSheet
          key={vm.editingRow.userId}
          teamId={vm.teamId}
          playerId={vm.editingRow.userId}
          playerName={vm.editingRow.displayName}
          onClose={vm.closeEditor}
        />
      )}
    </div>
  )
}
