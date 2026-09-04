import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { MissingDocumentAlert } from './components/MissingDocumentAlert'
import { NextConvocationCard } from './components/NextConvocationCard'
import { PlayerHeader } from './components/PlayerHeader'
import { UpcomingConvocationList } from './components/UpcomingConvocationList'
import { usePlayerDashboardViewModel } from './usePlayerDashboardViewModel'

// Aucune logique ici (ARCHITECTURE.md §6) — seuls les branchements
// isLoading/error déjà calculés par le ViewModel, même règle que
// CoachDashboardPage. Pas de bouton flottant "+" ici (contrairement au
// coach) — le joueur n'a pas la permission convocation:create (§2).
export function PlayerDashboardPage() {
  const vm = usePlayerDashboardViewModel()

  if (vm.isLoading) return <p>Chargement…</p>
  if (vm.error) return <p role="alert">Une erreur est survenue.</p>

  return (
    <div className="flex flex-col text-white">
      <PlayerHeader
        firstName={vm.firstName}
        initials={vm.initials}
        teamName={vm.teamName}
        onRoleClick={vm.onRoleClick}
        onAvatarClick={vm.goToProfilePage}
      />

      <div className="flex flex-col gap-5 px-5.5 pb-16">
        <MissingDocumentAlert visible={vm.hasMissingDocument} onOpen={vm.goToDocuments} />

        <NextConvocationCard
          data={vm.nextConvocation}
          canRespond={vm.canRespond}
          onRespondPresent={vm.onRespondPresent}
          onRespondAbsent={vm.onRespondAbsent}
          onOpen={() => vm.nextConvocation && vm.goToConvocationDetail(vm.nextConvocation.convocation.id)}
        />

        {/* No generic toast/snackbar component yet (docs/DEFAULTS-A-CHALLENGER.md)
            — every UiErrorVariant renders as the same inline alert near the
            action that failed until one exists; data-variant is kept on the
            markup so that future wiring doesn't have to touch this branch. */}
        {vm.respondError && (
          <Alert variant="destructive" data-variant={vm.respondError.variant}>
            <AlertDescription>{vm.respondError.message}</AlertDescription>
          </Alert>
        )}

        <UpcomingConvocationList items={vm.upcomingList} onOpen={vm.goToConvocationDetail} onSeeAll={vm.goToCalendar} />
      </div>

      {/* UI design §"Fin de l'écran en v1" — the screen stops after "À
          venir", straight into BottomNav (AppShell). "Dernier match" /
          "Mes stats" are intentionally not scaffolded: PO-PD-02 and
          PO-PD-07 are still open, and the spec explicitly says not to
          reserve empty space or a placeholder for them. */}
    </div>
  )
}
