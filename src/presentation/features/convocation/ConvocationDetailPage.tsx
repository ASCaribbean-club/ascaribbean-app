import { IconTrophy } from '@tabler/icons-react'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Badge } from '@presentation/shared/components/ui/badge'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { cn } from '@presentation/shared/lib/utils'
import { formatConvocationType } from '../../shared/formatters/convocation-labels'
import { formatRole } from '../../shared/formatters/role-labels'
import { Tabs, TabsContent, TabsList, TabsTrigger } from '../../shared/components/ui/tabs'
import { ConvocationHero } from './components/ConvocationHero'
import { EffectifTab } from './components/EffectifTab'
import { InfosTab } from './components/InfosTab'
import { NotFoundState } from './components/NotFoundState'
import { RoleMismatchState } from './components/RoleMismatchState'
import type { VoteCategoryViewModel } from './components/VotesTab'
import { VotesTab } from './components/VotesTab'
import { useConvocationDetailViewModel } from './useConvocationDetailViewModel'

// specs/player-vote.md — composes useConvocationDetailViewModel's plain
// `votes` data/state into the JSX-bearing `VoteCategoryViewModel[]` VotesTab
// renders. Lives here (a .tsx file) rather than in the hook (.ts, can't hold
// JSX) — same split ARCHITECTURE.md §6 already draws elsewhere on this
// screen (e.g. AttendanceConfirmRow picks its own icons rather than
// receiving them from the ViewModel). Every branch below reads a value the
// ViewModel already computed (`myVote`, `isEditingVote`, `tally`); it never
// derives a NEW business fact, only which JSX shape represents one.
function buildVoteCategories(
  votes: ReturnType<typeof useConvocationDetailViewModel>['votes'] & { categoryLabel: string },
  activeRole: ReturnType<typeof useConvocationDetailViewModel>['activeRole'],
): VoteCategoryViewModel[] {
  const icon = <IconTrophy className="size-3.5" aria-hidden />

  // Coach: consultation only, absolute counts, never a ballot (specs/
  // player-vote.md §2 — "aucun contrôle de saisie rendu"). AC-PV-13 — zero
  // votes yet is an explicit empty state, never a zero-filled list.
  if (activeRole === 'coach') {
    const candidates = votes.tally?.candidates ?? []
    return [
      {
        id: votes.categoryId,
        icon,
        label: votes.categoryLabel,
        body:
          candidates.length === 0
            ? { kind: 'empty', emptyMessage: 'Aucun vote enregistré pour cette catégorie.' }
            : {
                kind: 'results',
                unit: 'absolute',
                candidates: candidates.map((c) => ({ id: c.candidateId, name: c.candidateDisplayName, value: c.voteCount })),
              },
      },
    ]
  }

  // Player: ballot until a vote is cast, or while "Changer mon vote" has
  // reopened it — never both at once for the same category (UI design,
  // "jamais les deux à la fois").
  if (!votes.myVote || votes.isEditingVote) {
    return [
      {
        id: votes.categoryId,
        icon,
        label: votes.categoryLabel,
        statusBadge: (
          <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold', 'border-white/12 bg-white/8 text-white/60')}>
            Résultats masqués
          </Badge>
        ),
        body: {
          kind: 'ballot',
          candidates: votes.candidates.map((c) => ({ id: c.userId, name: c.displayName })),
          selectedCandidateId: votes.selectedCandidateId,
          onSelectCandidate: votes.onSelectCandidate,
          onSubmit: votes.onSubmit,
          isSubmitting: votes.isSubmitting,
          submitErrorMessage: votes.submitError?.message ?? null,
        },
      },
    ]
  }

  // Player, already voted: percentages, "Ton choix" on their own row
  // (VoteCategoryCard resolves that from `myCandidateId`), "Changer mon
  // vote" while PO-PV-06's voting window stays unresolved (always present
  // once voted — no "votes closed" state is composed yet).
  const tallyCandidates = votes.tally?.candidates ?? []
  const totalVotes = tallyCandidates.reduce((sum, c) => sum + c.voteCount, 0)
  const totalEligible = votes.tally?.totalEligibleVoters ?? 0
  return [
    {
      id: votes.categoryId,
      icon,
      label: votes.categoryLabel,
      statusBadge: (
        <Badge
          className={cn(
            'rounded-full border px-2.5 py-1 text-[11px] font-bold',
            'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
          )}
        >
          Vote enregistré
        </Badge>
      ),
      body: {
        kind: 'results',
        unit: 'percentage',
        candidates: tallyCandidates.map((c) => ({
          id: c.candidateId,
          name: c.candidateDisplayName,
          value: totalVotes > 0 ? Math.round((c.voteCount / totalVotes) * 100) : 0,
        })),
        myCandidateId: votes.myVote?.candidateId ?? null,
        voteCountLabel: `${totalVotes} vote${totalVotes > 1 ? 's' : ''} sur ${totalEligible} joueur${totalEligible > 1 ? 's' : ''}`,
        onChangeVote: votes.onChangeVote,
      },
    },
  ]
}

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

          {/* Three tabs (UI design §"Barre d'onglets à trois entrées",
              resolving PO-PV-14): "Compo"/"Disposition"/"Stats"/
              "Messagerie" removed entirely — correction #2, no domain
              support for any of them — but "Votes" is added back
              (specs/player-vote.md), reopening the decision
              specs/match_details_page.md originally made for lack of
              support. TabsTrigger's own base class already carries
              `flex-1` (shared/components/ui/tabs.tsx), so three equal-width
              labels fit a 360-430px viewport without the horizontal
              scroll/truncation the six-tab mockup export shows — no
              className change needed here to get that, just one more
              TabsTrigger. Overridden onto the dark theme the same way every
              other shadcn primitive on this screen is (CLAUDE.md §2) — the
              default bg-muted/bg-background tokens would render as
              light-on-dark otherwise. `w-full`/`px-5.5` (not shadcn's own
              `w-auto`) so the bar spans edge-to-edge like the rest of this
              sticky group. `bg-transparent` (not `bg-coach-bg`) so the
              group's own image+tint background above shows through here
              too, instead of a flat block breaking the image right at the
              tab titles.

              "Votes" itself is further gated to `type === 'match'`
              (specs/player-vote.md PO-PV-08: "restreindre au type match en
              v1 est le choix conservateur et réversible" — the three
              mockups only ever show a match, and a vote on a training or
              meeting has no defined meaning). Two tabs for a
              training/meeting convocation, three for a match — absent, not
              disabled, same "moindre privilège" rule as every other
              role-gated control on this screen. */}
          <TabsList className="h-auto w-full justify-start gap-5 rounded-none border-b border-white/10 bg-transparent p-0 px-5.5">
            <TabsTrigger
              value="infos"
              className="h-11 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-[14px] font-bold text-white/50 shadow-none data-[state=active]:border-coach-green data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Infos
            </TabsTrigger>
            <TabsTrigger
              value="effectif"
              className="h-11 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-[14px] font-bold text-white/50 shadow-none data-[state=active]:border-coach-green data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
            >
              Effectif
            </TabsTrigger>
            {convocation.type === 'match' && (
              <TabsTrigger
                value="votes"
                className="h-11 rounded-none border-0 border-b-2 border-transparent bg-transparent px-0 pb-2.5 text-[14px] font-bold text-white/50 shadow-none data-[state=active]:border-coach-green data-[state=active]:bg-transparent data-[state=active]:text-white data-[state=active]:shadow-none"
              >
                Votes
              </TabsTrigger>
            )}
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

        {/* PO-PV-08 — mirrors the TabsTrigger gate above: no "votes" TabsContent
            at all for a non-match convocation, not an empty/disabled one. */}
        {convocation.type === 'match' && (
          <TabsContent value="votes">
            {/* specs/player-vote.md — AC-PV-16/PO-PV-02: only the positive
                category is ever built here, never a second hardcoded row for
                the negative one — buildVoteCategories always returns a
                single-entry array. PO-PV-06 (voting window) stays
                unresolved: no "votes closed" state is composed. */}
            {vm.votes.categoryLabel === null ? (
              <p>Chargement…</p>
            ) : (
              <VotesTab categories={buildVoteCategories({ ...vm.votes, categoryLabel: vm.votes.categoryLabel }, vm.activeRole)} />
            )}
          </TabsContent>
        )}
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
