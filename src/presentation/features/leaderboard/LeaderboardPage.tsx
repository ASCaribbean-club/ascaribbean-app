import { IconCalendarOff, IconUsers, IconUsersGroup } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { Button } from '@presentation/shared/components/ui/button'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { LeaderboardFilters } from './components/LeaderboardFilters'
import { LeaderboardRow } from './components/LeaderboardRow'
import { LeaderboardSkeleton } from './components/LeaderboardSkeleton'
import { PresenceRow } from './components/PresenceRow'
import { LeaderboardTabs } from './components/LeaderboardTabs'
import { YouBar } from './components/YouBar'
import { useLeaderboardViewModel } from './useLeaderboardViewModel'

const EMPTY_TAB_HINT = {
  goals: 'Aucun but cette saison pour l\'instant.',
  yellow: 'Aucun carton jaune cette saison pour l\'instant.',
  red: 'Aucun carton rouge cette saison pour l\'instant.',
} as const

// Same red/green backdrop as ConvocationDetailPage (fixed, behind content;
// the `isolate` on each root keeps the -z-10 inside this screen's own
// stacking context so it never slips behind the root's bg-coach-bg).
const backdrop = (
  <div
    aria-hidden
    className="pointer-events-none fixed inset-0 -z-10 bg-[url(/background.jpeg)] bg-[length:160%_auto] bg-no-repeat bg-top opacity-40"
  />
)

// specs/mobile-leaderboard.md — zero business logic: only branches on values
// the ViewModel already computed. Same page for player and coach; only the
// own-row emphasis + YouBar differ (vm.showOwnRowEmphasis / vm.youBar).
export function LeaderboardPage() {
  const vm = useLeaderboardViewModel()

  const header = <BackHeader title="Classements" onBack={vm.goBack} />

  // Dirigeant only: which team's ranking to read (section, then team).
  const filters = vm.isOfficerView ? (
    <div className="px-5.5 pb-4">
      <LeaderboardFilters
        isExpanded={vm.areFiltersVisible}
        onToggle={vm.toggleFilters}
        summary={vm.filtersSummary}
        sections={vm.sections}
        areSectionsLoading={vm.areSectionsLoading}
        selectedSectionId={vm.selectedSectionId}
        onSelectSection={vm.onSelectSection}
        teamOptions={vm.teamOptions}
        selectedTeamId={vm.selectedTeamId}
        onSelectTeam={vm.onSelectTeam}
      />
    </div>
  ) : null

  if (vm.error) {
    return (
      <div className="relative isolate flex min-h-screen flex-col bg-coach-bg text-white">
        {backdrop}
        {header}
        {filters}
        <div className="flex flex-col items-center gap-4 px-5.5 py-16 text-center">
          <p role="alert" className="text-[14.5px] font-semibold">Impossible de charger le classement.</p>
          <Button onClick={vm.refetch} className="h-11 px-6">Réessayer</Button>
        </div>
      </div>
    )
  }

  if (vm.needsTeamSelection && !vm.noCurrentSeason) {
    return (
      <div className="relative isolate flex min-h-screen flex-col bg-coach-bg text-white">
        {backdrop}
        {header}
        {filters}
        <p className="px-5.5 py-8 text-center text-[14px] text-white/60">
          {vm.selectedSectionId ? 'Choisissez une équipe.' : 'Choisissez une section, puis une équipe.'}
        </p>
      </div>
    )
  }

  if (vm.noCurrentSeason || vm.noTeam || vm.isRosterEmpty) {
    return (
      <div className="relative isolate flex min-h-screen flex-col bg-coach-bg text-white">
        {backdrop}
        {header}
        {filters}
        {vm.noCurrentSeason ? (
          <EmptyState icon={IconCalendarOff} message="Aucune saison en cours actuellement." />
        ) : vm.noTeam ? (
          <EmptyState icon={IconUsersGroup} message="Aucune équipe à afficher pour le moment." />
        ) : (
          <EmptyState icon={IconUsers} message="Aucun joueur dans cette équipe pour le moment." />
        )}
      </div>
    )
  }

  return (
    <div className="relative isolate flex min-h-screen flex-col bg-coach-bg text-white">
      {backdrop}
      {header}
      {filters}

      <div className={`flex flex-1 flex-col px-5.5 pt-1 ${vm.youBar ? 'pb-4' : 'pb-10'}`}>
        <LeaderboardTabs tab={vm.tab} onTabChange={vm.onTabChange}>
          {vm.isLoading ? (
            <LeaderboardSkeleton />
          ) : vm.isPresenceTab ? (
            <>
              {vm.isPresenceTabAllZero && <p className="text-[13px] text-white/50">Aucune présence confirmée cette saison pour l'instant.</p>}
              <ol className="flex flex-col">
                {vm.presenceRows.map((row) => (
                  <PresenceRow key={row.userId} row={row} emphasizeOwn={vm.showOwnRowEmphasis} />
                ))}
              </ol>
            </>
          ) : (
            <>
              {vm.isActiveTabAllZero && <p className="text-[13px] text-white/50">{EMPTY_TAB_HINT[vm.metric]}</p>}
              <ol className="flex flex-col">
                {vm.rows.map((row) => (
                  <LeaderboardRow key={row.userId} row={row} metric={vm.metric} emphasizeOwn={vm.showOwnRowEmphasis} />
                ))}
              </ol>
            </>
          )}
        </LeaderboardTabs>
      </div>

      {vm.youBar && !vm.isLoading && (
        <YouBar metric={vm.metric} rank={vm.youBar.rank} displayName={vm.youBar.displayName} value={vm.youBar.value} onClick={vm.scrollToOwnRow} />
      )}
    </div>
  )
}
