import { CoachHeader } from './components/CoachHeader'
import { CreateConvocationFab } from './components/CreateConvocationFab'
import { FormAndGoalsRow } from './components/FormAndGoalsRow'
import { NextMatchCard } from './components/NextMatchCard'
import { UpcomingList } from './components/UpcomingList'
import { useCoachDashboardViewModel } from './useCoachDashboardViewModel'

// Aucune logique ici (ARCHITECTURE.md §6) — seuls les branchements
// isLoading/error/canX déjà calculés par le ViewModel.
export function CoachDashboardPage() {
  const vm = useCoachDashboardViewModel()

  if (vm.isLoading) return <p>Chargement…</p>
  if (vm.error) return <p role="alert">Une erreur est survenue.</p>

  return (
    <div className="flex flex-col gap-5 px-5.5 pt-5.5 pb-6 text-white">
      <CoachHeader
        firstName={vm.firstName}
        initials={vm.initials}
        teamName={vm.currentTeam?.name}
        activeMemberCount={vm.activeMemberCount}
        dayMarker={vm.dayMarker}
        hasMultipleTeams={vm.hasMultipleTeams}
        onRoleClick={vm.onRoleClick}
        onTeamSelectorClick={vm.onTeamSelectorClick}
      />

      <NextMatchCard nextMatch={vm.nextMatch} onOpen={vm.goToCalendar} />

      <FormAndGoalsRow />

      <UpcomingList items={vm.upcomingList} onOpen={vm.goToConvocationDetail} onSeeAll={vm.goToCalendar} />

      <CreateConvocationFab visible={vm.canCreateConvocation} onClick={vm.openConvocationCreate} />
    </div>
  )
}
