import { Navigate } from 'react-router-dom'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { CompetitionFilterPlaceholder } from './components/CompetitionFilterPlaceholder'
import { CurrentSeasonSelect } from './components/CurrentSeasonSelect'
import { TeamAttendanceSummaryCard } from './components/TeamAttendanceSummaryCard'
import { TeamCardsSummaryRow } from './components/TeamCardsSummaryRow'
import { TeamIdentityRow } from './components/TeamIdentityRow'
import { TeamRosterSection } from './components/TeamRosterSection'
import { useTeamStatsViewModel } from './useTeamStatsViewModel'

// specs/coach-team-stats.md — zero business logic here (CLAUDE.md §4): only
// the isLoading/error/canX branches the ViewModel already computed.
//
// ⚠️ Not wired from the Menu "Statistiques" card in this pass (PO-CTS-06 —
// specs/menu.md AC-MN-04 still requires that card to stay disabled). Reached
// directly via its own route for now, per the spec's own instruction.
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
            <CompetitionFilterPlaceholder />
            <TeamAttendanceSummaryCard summary={vm.teamAttendance} />
            <TeamRosterSection roster={vm.roster} filter={vm.filter} onFilterChange={vm.onFilterChange} />
            <TeamCardsSummaryRow cards={vm.teamCards} />
          </>
        )}
      </div>
    </div>
  )
}
