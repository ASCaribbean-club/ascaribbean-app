import { FloatingActionButton } from '@presentation/shared/components/FloatingActionButton'
import { SectionFilterChips } from '@presentation/shared/components/SectionFilterChips'
import { Button } from '@presentation/shared/components/ui/button'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { DirigeantHeader } from './components/DirigeantHeader'
import { NextEventCard } from './components/NextEventCard'
import { OverviewTiles } from './components/OverviewTiles'
import { UpcomingEventList } from './components/UpcomingEventList'
import { useDirigeantDashboardViewModel } from './useDirigeantDashboardViewModel'

// Aucune logique ici (ARCHITECTURE.md §6) — seuls les branchements
// isScheduleLoading/hasScheduleError/canX déjà calculés par le ViewModel.
// Le header et les puces restent affichés pendant le chargement et en cas
// d'erreur de lecture des échéances.
export function DirigeantDashboardPage() {
  const vm = useDirigeantDashboardViewModel()

  return (
    <div className="flex flex-col text-white">
      <DirigeantHeader
        firstName={vm.firstName}
        initials={vm.initials}
        contextLabel={vm.contextLabel}
        onAvatarClick={vm.goToProfilePage}
      />

      <div className="flex flex-col gap-4 px-5.5 pb-28">
        <OverviewTiles tiles={vm.tiles} />

        <SectionFilterChips
          sections={vm.sections}
          selectedSectionId={vm.selectedSectionId}
          isLoading={vm.areSectionsLoading}
          onSelect={vm.onSelectSection}
        />

        {vm.isScheduleLoading && (
          <div className="flex flex-col gap-3" aria-hidden>
            <Skeleton className="h-36 w-full rounded-2xl bg-white/10" />
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-12 w-full bg-white/10" />
            ))}
          </div>
        )}

        {vm.hasScheduleError && (
          <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
            <p role="alert" className="text-[14px] text-white/80">
              Impossible de charger les échéances.
            </p>
            <Button type="button" variant="outline" onClick={vm.retrySchedule} className="h-11 border-white/20 text-white">
              Réessayer
            </Button>
          </div>
        )}

        {!vm.isScheduleLoading && !vm.hasScheduleError && (
          <>
            {vm.nextEvent && <NextEventCard event={vm.nextEvent} />}
            <UpcomingEventList title={vm.upcomingTitle} items={vm.upcomingList} onSeeCalendar={vm.goToCalendar} />
          </>
        )}
      </div>

      <FloatingActionButton visible={vm.canCreateConvocation} label="Créer une convocation" onClick={vm.openConvocationCreate} />
    </div>
  )
}
