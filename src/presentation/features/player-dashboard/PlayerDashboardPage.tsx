import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { TeamFormAndGoalsRow } from '@presentation/shared/components/TeamFormAndGoalsRow'
import { DuesReminderBanner } from '@presentation/shared/components/DuesReminderBanner'
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
        onAvatarClick={vm.goToProfilePage}
      />

      <div className="flex flex-col gap-5 px-5.5 pb-16">
        <MissingDocumentAlert visible={vm.hasMissingDocument} onOpen={vm.goToDocuments} />

        {/* Document alert first, dues reminder after — never merged (amendement (4) UI, (b)). */}
        <DuesReminderBanner />

        <NextConvocationCard
          data={vm.nextConvocation}
          missionsLine={vm.missionsLine}
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

        {/* PO-PD-07, resolved 2026-09-30 — real team form/goals, same
            shared component and use case as the coach dashboard's
            equivalent block. PO-PD-02 (player access to AttendanceRecord)
            stays open: no attendance/"Présence %" figure is shown here,
            only the goals/form half of the old "Mes stats" mockup block. */}
        <TeamFormAndGoalsRow form={vm.teamForm} goalsFor={vm.teamGoalsFor} goalsAgainst={vm.teamGoalsAgainst} />

        <UpcomingConvocationList items={vm.upcomingList} onOpen={vm.goToConvocationDetail} onSeeAll={vm.goToCalendar} />
      </div>

      {/* UI design §"Fin de l'écran en v1" — the rest of the original
          "Dernier match" / "Mes stats" mockup block (playing-time,
          Présence %) is still NOT scaffolded: PO-PD-02 and the
          "Titulaire · 78'" playing-time question remain open. Only the
          form/goals half above was resolved. */}
    </div>
  )
}
