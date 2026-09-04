import { IconCalendarOff } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { CalendarHeader } from './components/CalendarHeader'
import { CalendarRangeNav } from './components/CalendarRangeNav'
import { CalendarConvocationList } from './components/CalendarConvocationList'
import { useCalendarViewModel } from './useCalendarViewModel'

// Aucune logique ici (ARCHITECTURE.md §6) — seuls les branchements
// isLoading/error/hasAnyConvocationInScope déjà calculés par le ViewModel,
// même règle que CoachDashboardPage/PlayerDashboardPage. AC-CA-18: pas de
// flèche retour (2ᵉ onglet fixe de la nav basse, à l'intérieur d'AppShell),
// donc pas de BackHeader `sticky` non plus — même raisonnement que
// specs/menu.md. Pas de bouton "+" (PO-CA-04, non construit par cette
// passe, absent plutôt que grisé).
export function CalendarPage() {
  const vm = useCalendarViewModel()

  if (vm.isLoading) return <p>Chargement…</p>
  if (vm.error) return <p role="alert">Une erreur est survenue.</p>

  return (
    <div className="flex flex-col text-white">
      <CalendarHeader monthYearLabel={vm.monthYearLabel} />

      {!vm.hasAnyConvocationInScope ? (
        // AC-CA-11 — aucune équipe / aucune saison en cours / aucune
        // échéance dans toute la portée de l'utilisateur : écran réduit au
        // titre + EmptyState, pas de bande de jours vide (UI design §4).
        <EmptyState icon={IconCalendarOff} message="Aucune échéance pour le moment" />
      ) : (
        <div className="flex flex-col gap-5 px-5.5 pb-16">
          <CalendarRangeNav
            mode={vm.rangeMode}
            onChangeMode={vm.onChangeRangeMode}
            scopeLabel={vm.scopeLabel}
            onNavigatePrevious={vm.onNavigatePrevious}
            onNavigateNext={vm.onNavigateNext}
            selectedDate={vm.selectedDate}
            today={vm.today}
            onSelectDate={vm.onSelectDate}
            weekDays={vm.weekDays}
            monthWeeks={vm.monthWeeks}
          />

          {/* Same "no generic toast yet" inline-alert treatment as
              PlayerDashboardPage's respondError — see that component's own
              comment (docs/DEFAULTS-A-CHALLENGER.md). */}
          {vm.respondError && (
            <Alert variant="destructive" data-variant={vm.respondError.variant}>
              <AlertDescription>{vm.respondError.message}</AlertDescription>
            </Alert>
          )}

          <CalendarConvocationList
            items={vm.selectedDayItems}
            mode={vm.rangeMode}
            selectedDate={vm.selectedDate}
            onOpen={vm.goToConvocationDetail}
          />
        </div>
      )}
    </div>
  )
}
