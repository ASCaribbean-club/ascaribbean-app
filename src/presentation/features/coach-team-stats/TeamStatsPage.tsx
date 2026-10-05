import { Navigate } from 'react-router-dom'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { CurrentSeasonSelect } from './components/CurrentSeasonSelect'
import { TeamAttendanceSummaryCard } from './components/TeamAttendanceSummaryCard'
import { TeamIdentityRow } from './components/TeamIdentityRow'
import { TeamRosterSection } from './components/TeamRosterSection'
import { TeamStatsSummaryRow } from './components/TeamStatsSummaryRow'
import { useTeamStatsViewModel } from './useTeamStatsViewModel'

// specs/coach-team-stats.md — zero business logic here (CLAUDE.md §4): only
// the isLoading/error/canX branches the ViewModel already computed.
//
// PO-CTS-06 resolved: the Menu's "Statistiques" card now routes here for the
// coach active role (MenuPage.tsx/useMenuViewModel.ts) rather than always
// pointing at the player-stats screen.
export function TeamStatsPage() {
  const vm = useTeamStatsViewModel()

  if (vm.isLoading) return <p className="p-5.5 text-white">Chargement…</p>
  if (vm.error) return <p role="alert" className="p-5.5 text-white">Une erreur est survenue.</p>

  // AC-CTS-02 — for any non-coach token (or a coach viewing a team they
  // aren't assigned to), the screen is ABSENT, never a grayed-out or
  // error-flashing variant of itself.
  if (!vm.canViewTeamStats) return <Navigate to="/" replace />

  return (
    <div className="flex min-h-screen flex-col bg-coach-bg text-white">
      <BackHeader title="Statistiques de l'équipe" onBack={vm.goBack} />

      <div className="flex flex-col gap-5 px-5.5 pt-1 pb-10">
        <TeamIdentityRow sectionName={vm.sectionName} activeMemberCount={vm.activeMemberCount} />

        {vm.noCurrentSeason ? (
          // AC-CTS-16 — "current_season() peut ne retourner aucune ligne" is
          // its own valid, distinct empty state, never an error.
          <p className="text-[13px] text-white/50">Aucune saison en cours actuellement.</p>
        ) : (
          <>
            <CurrentSeasonSelect seasonLabel={vm.seasonLabel} />
            <TeamAttendanceSummaryCard summary={vm.teamAttendance} responses={vm.teamResponses} />
            <TeamStatsSummaryRow goals={vm.teamGoals} cards={vm.teamCards} />
            <TeamRosterSection roster={vm.roster} filter={vm.filter} onFilterChange={vm.onFilterChange} />
          </>
        )}
      </div>
    </div>
  )
}
