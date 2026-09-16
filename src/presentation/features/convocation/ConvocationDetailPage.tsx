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
    <div className="relative isolate flex min-h-full flex-col bg-coach-bg font-coach text-white">
      {/* Single, faint background image for the WHOLE screen (2026-09-16) —
          one continuous layer behind BackHeader/Hero/Tabs alike, not a
          separate stronger one just for the hero (that produced a visible
          seam between two different treatments). `fixed inset-0` (2026-09-16,
          "background should stay fixed on scroll too") — genuinely pinned to
          the viewport, unlike `absolute`, which scrolls away with this tall
          page's own content. An earlier `fixed` attempt (before this div's
          `relative isolate` ancestor existed) got hidden behind the tab
          cards, most likely #root's own `position: fixed` (global.css, iOS
          cold-start workaround) muddying which stacking context this div's
          negative z-index compared against; `isolate` on the ancestor now
          pins that comparison to THIS local stacking context explicitly, so
          if it regresses again, look there first rather than re-guessing.
          `bg-cover` alone forced an extreme zoomed-in crop over a full page's
          height — `bg-[length:160%_auto]` + `bg-no-repeat` instead sizes ONE
          copy of the image a bit past the screen's own width (bigger, more
          of it filling the top), centered and anchored at the top, and lets
          it run out (no tiling) rather than repeating. */}
      <div
        aria-hidden
        className="pointer-events-none fixed inset-0 -z-10 bg-[url(/background.jpeg)] bg-[length:160%_auto] bg-no-repeat bg-top opacity-40"
      />

      <Tabs value={vm.activeTab} onValueChange={(value) => vm.setActiveTab(value as typeof vm.activeTab)} className="flex-1 gap-0">
        {/* BackHeader + ConvocationHero + TabsList now pin together as ONE
            sticky unit (2026-09-16 — "ConvocationHero should also be
            pinned"). Grouping them (instead of giving each its own `sticky
            top-[…]` with a hand-computed offset) sidesteps Hero's height
            varying by convocation.type (match's avatar face-off vs.
            training/meeting's shorter text block, plus the optional
            cancellation-reason line) — the group just sticks at top-0 and
            lays out normally inside itself, so there's nothing to keep in
            sync by hand. BackHeader keeps its own internal `sticky top-0`
            (CLAUDE.md §6, shared by CreateConvocationForm/ProfilePage too) —
            redundant here since the group above it is already pinned, but
            harmless (both resolve to the same top-0 position).

            The group's own background repeats the SAME image/size/position
            as the page-level layer below (not a flat `bg-coach-bg`) —
            2026-09-16, "Background should be visible ... behind
            ConvocationHero, tabs titles and content": a flat color here hid
            the image the moment this group pins to the top, since it then
            permanently covers exactly the region where the image lives.
            Because both layers anchor `bg-top` at the same on-screen
            position (this group sits flush against the page's own top edge
            at rest), the two reads as one continuous image with no seam.
            The `oklch(9% 0.006 90/0.6)` flat-tint gradient (same color
            twice, the standard CSS trick for a solid overlay combinable
            with `url()` in one `background-image` list) keeps the group
            fully OPAQUE as a box — unlike the page layer's own `opacity-40`,
            which would make the whole element see-through and let
            TabsContent rows scrolling underneath show through the pinned
            bar. */}
        <div className="sticky top-0 z-10 flex flex-col bg-coach-bg bg-[linear-gradient(0deg,oklch(9%_0.006_90/0.6),oklch(9%_0.006_90/0.6)),url(/background.jpeg)] bg-[length:160%_auto] bg-no-repeat bg-top">
          {/* Title is ALWAYS formatConvocationType — never the opponent's
              name, even for a match (UI design §"Structure de l'écran",
              point 1: "la maquette... affiche seulement «Match», jamais le
              nom de l'adversaire en titre"). */}
          <BackHeader title={formatConvocationType(convocation.type)} onBack={vm.goBack} />

          <ConvocationHero
            convocation={convocation}
            teamName={vm.teamName}
            sectionName={vm.sectionName}
            opponent={vm.opponent}
            meetingDetails={vm.meetingDetails}
          />

          {/* Two tabs only (UI design: "Compo", "Votes", "Messagerie" removed
              entirely — correction #2, no domain support for any of them).
              Overridden onto the dark theme the same way every other shadcn
              primitive on this screen is (CLAUDE.md §2) — the default
              bg-muted/bg-background tokens would render as light-on-dark
              otherwise. `w-full`/`px-5.5` (not shadcn's own `w-auto`) so the
              bar spans edge-to-edge like the rest of this sticky group.
              `bg-transparent` (not `bg-coach-bg`) so the group's own
              image+tint background above shows through here too, instead of
              a flat block breaking the image right at the tab titles. */}
          <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b border-white/10 bg-transparent p-0 px-5.5">
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
        </div>

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
