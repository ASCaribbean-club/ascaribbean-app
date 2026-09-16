import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { formatConvocationType } from '../../shared/formatters/convocation-labels'
import { formatRole } from '../../shared/formatters/role-labels'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/components/ui/tabs'
import { ConvocationHero } from './components/ConvocationHero'
import { EffectifTab } from './components/EffectifTab'
import { InfosTab } from './components/InfosTab'
import { NotFoundState } from './components/NotFoundState'
import { RoleMismatchState } from './components/RoleMismatchState'
import { useConvocationDetailViewModel } from './useConvocationDetailViewModel'

// Zero business logic (ARCHITECTURE.md §6, same rule as CoachDashboardPage/
// PlayerDashboardPage) — every branch below is an isLoading/notFound/error
// check on a value the ViewModel already computed, never a calculation of
// its own. specs/match_details_page.md UI design, "Emplacement dans la
// nav": pushed as a full-screen route OUTSIDE AppShell (see router.tsx,
// same pattern as convocations/new) — no BottomNav here, which is why
// BackHeader (not AppShell's own chrome) is this screen's only way back.
export function ConvocationDetailPage() {
  const vm = useConvocationDetailViewModel()

  if (vm.isLoading) return <p>Chargement…</p>

  // AC-MD-01 — rendered for BOTH "doesn't exist" and "exists but out of
  // scope", indistinguishably by construction (see NotFoundState.tsx and
  // GetConvocationWithDetailsUseCase). A generic header (no convocation type
  // known yet) still gets a working back arrow.
  if (vm.notFound) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader title="Convocation" onBack={vm.goBack} />
        <NotFoundState />
      </div>
    )
  }

  if (vm.error || !vm.convocation) {
    return <p role="alert">Une erreur est survenue.</p>
  }

  const { convocation } = vm

  // specs/match_details_page.md, "Emplacement dans la nav" (resolution) —
  // the active dashboard role tab must apply to THIS convocation's team,
  // or neither variant below has anything valid to render. Accepted
  // consequence: a player-coach on the same team sees this instead of the
  // coach variant while "Joueur" is active — switching the active role
  // tab is the way out, not a bug (docs/DEFAULTS-A-CHALLENGER.md).
  if (!vm.roleMatchesConvocationTeam) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader title={formatConvocationType(convocation.type)} onBack={vm.goBack} />
        <RoleMismatchState activeRoleLabel={formatRole(vm.activeRole)} />
      </div>
    )
  }

  return (
    <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
      {/* Title is ALWAYS formatConvocationType — never the opponent's name,
          even for a match (UI design §"Structure de l'écran", point 1: "la
          maquette... affiche seulement «Match», jamais le nom de
          l'adversaire en titre"). */}
      <BackHeader title={formatConvocationType(convocation.type)} onBack={vm.goBack} />

      <ConvocationHero
        convocation={convocation}
        teamName={vm.teamName}
        opponent={vm.opponent}
        meetingDetails={vm.meetingDetails}
      />

      <Tabs value={vm.activeTab} onValueChange={(value) => vm.setActiveTab(value as typeof vm.activeTab)} className="flex-1 gap-0">
        {/* Two tabs only (UI design: "Compo", "Votes", "Messagerie" removed
            entirely — correction #2, no domain support for any of them).
            Overridden onto the dark theme the same way every other shadcn
            primitive on this screen is (CLAUDE.md §2) — the default
            bg-muted/bg-background tokens would render as light-on-dark
            otherwise. */}
        <TabsList className="mx-5.5 h-auto w-auto justify-start gap-5 rounded-none border-b border-white/10 bg-transparent p-0">
          <TabsTrigger
            value="infos"
            className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-[14px] font-bold text-white/50 shadow-none data-[state=active]:border-coach-green data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Infos
          </TabsTrigger>
          <TabsTrigger
            value="effectif"
            className="rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-[14px] font-bold text-white/50 shadow-none data-[state=active]:border-coach-green data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
          >
            Effectif
          </TabsTrigger>
        </TabsList>

        <TabsContent value="infos">
          <InfosTab convocation={convocation} matchDetails={vm.matchDetails} meetingDetails={vm.meetingDetails} />
        </TabsContent>

        <TabsContent value="effectif">
          {/* roleMatchesConvocationTeam is already true here (guarded above),
              so vm.activeRole reliably picks the right variant — no more
              defaulting-to-player-during-TODO. */}
          {vm.activeRole === 'coach' ? (
            <EffectifTab
              variant="coach"
              roster={vm.coachRoster}
              responseCounts={vm.responseCounts ?? { present: 0, absent: 0, pending: 0 }}
              canValidateAttendance={vm.canValidateAttendance}
              savingUserId={vm.savingUserId}
              errorByUserId={vm.attendanceErrorByUserId}
              onConfirmPresent={vm.onConfirmAttendancePresent}
              onConfirmAbsent={vm.onConfirmAttendanceAbsent}
            />
          ) : (
            <EffectifTab
              variant="player"
              self={{
                name: vm.self.name,
                position: vm.self.position,
                canRespond: vm.canRespond,
                myResponse: vm.playerResponse,
                onRespondPresent: vm.onRespondPresent,
                onRespondAbsent: vm.onRespondAbsent,
              }}
              others={vm.others}
            />
          )}
        </TabsContent>
      </Tabs>

      {/* Same inline-alert placeholder as PlayerDashboardPage — no generic
          toast/snackbar component exists yet in this project. */}
      {vm.respondError && (
        <div className="px-5.5 pb-6">
          <Alert variant="destructive" data-variant={vm.respondError.variant}>
            <AlertDescription>{vm.respondError.message}</AlertDescription>
          </Alert>
        </div>
      )}
    </div>
  )
}
