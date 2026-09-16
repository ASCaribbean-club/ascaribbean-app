import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import type { ActualStatus, DeclaredStatus } from '@domain/entities/convocation'
import { hasActiveRoleForConvocation } from '@domain/rules/active-role-scope'
import { canPlayerRespond } from '@domain/policies/response-deadline'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'

export type ConvocationDetailTab = 'infos' | 'effectif' | 'votes'

// specs/match_details_page.md §7 — this hook is the "câblage presentation/"
// the correction pass explicitly deferred (docs/convocation_visibility_rls_correction.md
// §6, "No presentation/ work in this pass"). Every useQuery/useMutation
// below points at the right use case (the "call site").
export function useConvocationDetailViewModel() {
  const { id: convocationId } = useParams<{ id: string }>()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const {
    teamRepository,
    sectionRepository,
    getConvocationWithDetailsUseCase,
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    getConvocationResponseByUserUseCase,
    respondToConvocationUseCase,
    confirmAttendanceUseCase,
    castVoteUseCase,
    getMyVoteUseCase,
    getVoteTallyUseCase,
    getVoteCategoryUseCase,
  } = useConvocationDependencies()

  // UI design §"Structure de l'écran" — "deux onglets seulement", local UI
  // state only (never persisted, never a route param): switching tabs isn't
  // a business action.
  const [activeTab, setActiveTab] = useState<ConvocationDetailTab>('infos')

  const detailedConvocationQuery = useQuery({
    queryKey: queryKeys.convocationDetail(convocationId ?? ''),
    queryFn: () => getConvocationWithDetailsUseCase.execute(convocationId!),
    enabled: !!convocationId,
  })

  const convocation = detailedConvocationQuery.data?.convocation

  const teamQuery = useQuery({
    queryKey: queryKeys.team(convocation?.teamId ?? ''),
    queryFn: () => teamRepository.findById(convocation!.teamId),
    enabled: !!convocation,
  })

  // 2026-09-16 hero pass — ConvocationHero's training title now reads
  // "Entraînement — {section.name}" (the club's own wording, not the team
  // itself, which moved down to the subtitle line). Chained off teamQuery
  // since the section id lives on Team, not Convocation.
  const sectionQuery = useQuery({
    queryKey: queryKeys.section(teamQuery.data?.sectionId ?? ''),
    queryFn: () => sectionRepository.findById(teamQuery.data!.sectionId),
    enabled: !!teamQuery.data,
  })

  // specs/match_details_page.md, "Emplacement dans la nav" (resolution,
  // mentoring session decision): the screen renders player or coach variant
  // strictly according to the dashboard's active role tab, now available
  // here because router.tsx moved ActiveRoleProvider up to wrap this route
  // too. Deliberately NOT recomputed from `user.roles` matched against
  // `convocation.teamId`, and NOT passed as router state from whichever
  // card's `onOpen` navigated here — single predictable source of truth.
  // Accepted consequence: a player-coach on the same team who opens this
  // screen with "Joueur" active sees the player variant even for a match
  // they also coach; they must switch their active role tab. Intentional,
  // not a bug — see docs/DEFAULTS-A-CHALLENGER.md.
  const { activeRole } = useActiveRole()

  // Does the active role tab even apply to THIS convocation's team? Purely
  // a rendering guard (which variant, or the empty state) — never a
  // substitute for `can()` below, which stays exactly as it was.
  const roleMatchesConvocationTeam = user && convocation ? hasActiveRoleForConvocation(user, activeRole, convocation) : false

  const respondersQuery = useQuery({
    queryKey: queryKeys.convocationResponders(convocationId ?? ''),
    queryFn: () => listConvocationRespondersUseCase.execute(convocationId!),
    // specs/player-vote.md PO-PV-10a — resolved (2026-09-16, developer
    // decision): the convoked roster this query already fetches for the
    // Effectif tab is also the vote ballot's candidate set, so the votes
    // tab needs this query enabled too rather than adding a second read
    // path for the same "who's convoked" data.
    enabled: !!convocationId && activeRole === 'player' && (activeTab === 'effectif' || activeTab === 'votes'),
  })

  const playerResponseQuery = useQuery({
    queryKey: queryKeys.playerConvocationResponse(convocationId ?? '', user?.id ?? ''),
    queryFn: () => getConvocationResponseByUserUseCase.execute(convocationId ?? '', user?.id ?? ''),
    enabled: !!convocationId && activeRole === 'player' && activeTab === 'effectif',
  })

  const rosterForCoachQuery = useQuery({
    queryKey: queryKeys.convocationRosterForCoach(convocationId ?? ''),
    queryFn: () => getConvocationRosterForCoachUseCase.execute(convocationId!),
    enabled: !!convocationId && activeRole === 'coach' && activeTab === 'effectif',
  })

  // Same minute-tick pattern as usePlayerDashboardViewModel, so canRespond
  // re-evaluates once the response window closes mid-session rather than
  // only on the next unrelated re-render (RESPONSE_DEADLINE_MINUTES is
  // minute-grained).
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // specs/coach-attendance-confirmation.md §2 — RBAC-only render gate,
  // moindre privilège (AC-AT-06/07): buttons must be ABSENT, never disabled,
  // for anyone this evaluates false for. `activeRole === 'coach'` is also
  // required — a coach+player multi-role account with "Joueur" active on
  // THIS screen must not see coach controls just because the underlying
  // `can()` check would pass, same reasoning as `canRespond` below gating on
  // `activeRole === 'player'`.
  const hasAttendanceValidatePermission = usePermission('attendance:validate', { teamId: convocation?.teamId })
  const canValidateAttendance = activeRole === 'coach' && hasAttendanceValidatePermission

  const hasRbacPermission = usePermission('convocation:respond', { teamId: convocation?.teamId })
  // AC-MD-13 — RBAC AND response-deadline window, same shape as
  // usePlayerDashboardViewModel.canRespond. Also gated on `activeRole`
  // ('coach' never responds, §2) — unchanged call site, `can()`/
  // `usePermission` still the sole authorization decision, only the
  // variant source (`variant` → `activeRole`) changed.
  const canRespond = activeRole === 'player' && hasRbacPermission && !!convocation && canPlayerRespond(convocation, now)

  const playerResponse: DeclaredStatus | null = playerResponseQuery.data?.status ?? null

  const [respondError, setRespondError] = useState<UiError | null>(null)

  const respondMutation = useMutation({
    mutationFn: (status: Extract<DeclaredStatus, 'present' | 'absent'>) => {
      if (!convocationId || !user) {
        return Promise.reject(new Error('no convocation to respond to yet'))
      }
      return respondToConvocationUseCase.execute({
        convocationId,
        userId: user.id,
        status,
        now: new Date(),
      })
    },
    onMutate: () => setRespondError(null),
    onSuccess: () => {
      setRespondError(null)
      const playerTeamId = user?.roles.find((r) => r.role === 'player')?.teamId

      // AC-MD-14 — same invalidation shape as usePlayerDashboardViewModel's to invalidate query cache after response
      if (convocationId) {
        if (activeRole === 'player' && playerTeamId) {
          void queryClient.invalidateQueries({ queryKey: queryKeys.playerUpcomingConvocations(playerTeamId, user.id) })
        }
        void queryClient.invalidateQueries({ queryKey: queryKeys.convocationResponders(convocationId) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.playerConvocationResponse(convocationId, user?.id ?? '') })
        // The base-table SELECT fix (20260903205143_convocation_responses_
        // select_own_or_coach.sql) lets a coach read a teammate's response
        // row, so the coach's roster view can go stale here too — same
        // reasoning as the two invalidations above, just for the coach
        // variant's own query key.
        void queryClient.invalidateQueries({ queryKey: queryKeys.convocationRosterForCoach(convocationId) })
      }
    },
    onError: (error) => setRespondError(mapDomainErrorToUiError(error)),
  })

  // Same duplicate-upsert guard as usePlayerDashboardViewModel's
  // onRespondPresent/onRespondAbsent: respondMutation.isPending blocks a
  // second tap in flight, and the already-recorded-same-status check blocks
  // re-tapping a response that's already the player's recorded answer.
  function onRespondPresent() {
    if (respondMutation.isPending || playerResponse === 'present') return
    respondMutation.mutate('present')
  }
  function onRespondAbsent() {
    if (respondMutation.isPending || playerResponse === 'absent') return

    respondMutation.mutate('absent')
  }

  // Keyed by userId (UI design §"État d'écriture en cours / échouée, par
  // ligne") — one row's failed write never affects another's, unlike the
  // single shared `respondError` field above.
  const [attendanceErrorByUserId, setAttendanceErrorByUserId] = useState<Record<string, string>>({})

  // specs/coach-attendance-confirmation.md §7 — call site only: mutationFn
  // points at ConfirmAttendanceUseCase.execute, which is what CLAUDE.md §4's
  // "queryFn only inside useXxxViewModel hooks" requires — the use case
  // itself stays domain/, this hook is the one place allowed to call it via
  // TanStack Query.
  const confirmAttendanceMutation = useMutation({
    mutationFn: (input: { userId: string; actualStatus: ActualStatus }) => {
      if (!convocationId || !user) {
        return Promise.reject(new Error('no convocation to confirm attendance for yet'))
      }
      return confirmAttendanceUseCase.execute({
        convocationId,
        userId: input.userId,
        actualStatus: input.actualStatus,
        validatedBy: user.id,
        now: new Date(),
      })
    },
    onMutate: (input) => {
      setAttendanceErrorByUserId((prev) => {
        if (!(input.userId in prev)) return prev
        const next = { ...prev }
        delete next[input.userId]
        return next
      })
    },
    onSuccess: (_data, input) => {
      if (!convocationId) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.convocationRosterForCoach(convocationId) })
      // AC-AT-10, spec §7 "mentor-agent" note — confirming the last required
      // player can flip convocation.status via the DB trigger
      // (attendance_records_close_convocation), unlike respondMutation's
      // onSuccess above where only the roster/responders keys are at stake.
      void queryClient.invalidateQueries({ queryKey: queryKeys.convocationDetail(convocationId) })
      setAttendanceErrorByUserId((prev) => {
        if (!(input.userId in prev)) return prev
        const next = { ...prev }
        delete next[input.userId]
        return next
      })
    },
    onError: (error, input) => {
      setAttendanceErrorByUserId((prev) => ({ ...prev, [input.userId]: mapDomainErrorToUiError(error).message }))
    },
  })

  // specs/coach-attendance-confirmation.md UI design, "État des deux
  // boutons": re-tapping the already-confirmed state is a deliberate no-op
  // VISUALLY but still re-fires the upsert ("un tap... déclenche quand même
  // l'upsert (AC-AT-03)") — the OPPOSITE of onRespondPresent/onRespondAbsent
  // above, which skip the call entirely on an already-recorded value. Do not
  // copy that guard here without re-reading AC-AT-03 first.
  function onConfirmAttendancePresent(userId: string) {
    confirmAttendanceMutation.mutate({ userId, actualStatus: 'present' })
  }
  function onConfirmAttendanceAbsent(userId: string) {
    confirmAttendanceMutation.mutate({ userId, actualStatus: 'absent' })
  }

  // TanStack Query's own tracked `.variables` — accurate per-row "in flight"
  // state without inventing separate local state for it, since only one
  // upsert can be in flight per mutation instance at a time.
  const savingUserId = confirmAttendanceMutation.isPending ? (confirmAttendanceMutation.variables?.userId ?? null) : null

  // "Reste de l'effectif" (RosterList's `others`) excludes the current user
  // — their own row is SelfRosterRow instead (UI design §"Nouveau composant
  // — liste Effectif": always first, "<nom> (moi)"). Plain identity
  // filter, not a business rule — kept here rather than in the component
  // per ARCHITECTURE.md §6 ("un composant ne calcule rien").
  const others = (respondersQuery.data ?? []).filter((responder) => responder.userId !== user?.id)

  // --- specs/player-vote.md — third tab, net-new in this pass ---
  //
  // AC-PV-16/PO-PV-02 — only the positive category is ever wired here (the
  // negative category is REJECTED, not just deferred). This hook composes
  // plain data/state only (candidates, ballot vs. results booleans, error
  // strings) — the actual `VoteCategoryViewModel[]` (icon JSX, `Badge`
  // elements) is built in ConvocationDetailPage.tsx, a .tsx file, since
  // this hook is .ts and can't hold JSX (same reasoning AttendanceConfirmRow
  // picks its own icons rather than receiving them from this hook).
  //
  // specs/player-vote.md PO-PV-03 — resolved (2026-09-16, developer
  // decision): exactly one category, seeded as `vote_categories.id =
  // 'man_of_the_match'` (see supabase/migrations/20260916172217_vote_categories.sql).
  // The id itself is a fixed known value, not looked up — but its LABEL is
  // a database column (vote_categories.label), fetched below via
  // GetVoteCategoryUseCase rather than duplicated here as a constant.
  const POSITIVE_VOTE_CATEGORY_ID = 'man_of_the_match'

  const voteCategoryQuery = useQuery({
    queryKey: queryKeys.voteCategory(POSITIVE_VOTE_CATEGORY_ID),
    queryFn: () => getVoteCategoryUseCase.execute({ categoryId: POSITIVE_VOTE_CATEGORY_ID }),
    enabled: activeTab === 'votes',
  })

  const hasVoteCastPermission = usePermission('vote:cast', { teamId: convocation?.teamId })
  // Same activeRole-gate reasoning as canRespond/canValidateAttendance
  // above: a coach+player multi-role account with "Coach" active must not
  // see ballot controls just because can() would allow them as a player
  // (specs/player-vote.md §2, "moindre privilège... absence, pas
  // désactivation").
  const canCastVote = activeRole === 'player' && hasVoteCastPermission

  const myVoteQuery = useQuery({
    queryKey: queryKeys.voteMyBallot(convocationId ?? '', POSITIVE_VOTE_CATEGORY_ID, user?.id ?? ''),
    queryFn: () => getMyVoteUseCase.execute({ convocationId: convocationId!, categoryId: POSITIVE_VOTE_CATEGORY_ID, voterId: user!.id }),
    enabled: !!convocationId && !!user && activeTab === 'votes',
  })

  const voteTallyQuery = useQuery({
    queryKey: queryKeys.voteTally(convocationId ?? '', POSITIVE_VOTE_CATEGORY_ID),
    queryFn: () => getVoteTallyUseCase.execute({ convocationId: convocationId!, categoryId: POSITIVE_VOTE_CATEGORY_ID }),
    enabled: !!convocationId && activeTab === 'votes',
  })

  // specs/player-vote.md PO-PV-10a — resolved (2026-09-16, developer
  // decision): candidates are the convoked roster (respondersQuery, already
  // fetched above), never a new read path or a `convocation_attendees`
  // table (spec §5 explicitly forbids the latter). PO-PV-10b — resolved,
  // self-voting is not permitted, so the caller's own row is excluded here
  // exactly like `others` above filters itself out of the Effectif roster —
  // same identity filter, not a business rule, kept here per
  // ARCHITECTURE.md §6 rather than in VotesTab/VoteCategoryCard.
  const voteCandidates = (respondersQuery.data ?? []).filter((responder) => responder.userId !== user?.id)

  // Local-only: which radio is currently picked in the ballot, before
  // submission.
  const [voteSelectedCandidateId, setVoteSelectedCandidateId] = useState<string | null>(null)
  const [voteSubmitError, setVoteSubmitError] = useState<UiError | null>(null)
  // UI design "Changer mon vote" — the results card flips back to ballot
  // mode locally (no navigation), pre-selecting the previous choice. `false`
  // covers both "hasn't voted yet" (ballot renders regardless of this flag,
  // see ConvocationDetailPage.tsx's composition) and "voted, viewing
  // results" — only a "Changer mon vote" tap or a fresh mount ever flips it.
  const [isEditingVote, setIsEditingVote] = useState(false)

  function onChangeVote() {
    setVoteSelectedCandidateId(myVoteQuery.data?.candidateId ?? null)
    setIsEditingVote(true)
  }

  const castVoteMutation = useMutation({
    mutationFn: (candidateId: string) => {
      if (!convocationId || !user) {
        return Promise.reject(new Error('no convocation to vote on yet'))
      }
      return castVoteUseCase.execute({
        convocationId,
        categoryId: POSITIVE_VOTE_CATEGORY_ID,
        voterId: user.id,
        candidateId,
        now: new Date(),
      })
    },
    onMutate: () => setVoteSubmitError(null),
    onSuccess: () => {
      // AC-PV-05 — modifying a vote must update the aggregate too, not just
      // this voter's own row: both keys invalidated together, same
      // dual-invalidation shape as respondMutation's onSuccess above.
      if (!convocationId || !user) return
      void queryClient.invalidateQueries({ queryKey: queryKeys.voteTally(convocationId, POSITIVE_VOTE_CATEGORY_ID) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.voteMyBallot(convocationId, POSITIVE_VOTE_CATEGORY_ID, user.id) })
      setIsEditingVote(false)
    },
    onError: (error) => setVoteSubmitError(mapDomainErrorToUiError(error)),
  })

  function onSubmitVote() {
    if (!voteSelectedCandidateId || castVoteMutation.isPending) return
    castVoteMutation.mutate(voteSelectedCandidateId)
  }

  return {
    isLoading: detailedConvocationQuery.isLoading,
    // Merges every query this screen depends on — a failure on any one of
    // them (roster, responders, player's own response, team name) is a
    // real error, not silently indistinguishable from "nobody has
    // responded yet" (others/coachRoster/responseCounts all fall back to
    // an empty default below). Same `??` merge shape as
    // usePlayerDashboardViewModel's `error`.
    error:
      detailedConvocationQuery.error ??
      teamQuery.error ??
      sectionQuery.error ??
      respondersQuery.error ??
      playerResponseQuery.error ??
      rosterForCoachQuery.error,
    // AC-MD-01 — `null` is the one
    // state ConvocationDetailPage renders NotFoundState for; a genuine
    // network/server error stays in `error` above instead.
    notFound: detailedConvocationQuery.isSuccess && detailedConvocationQuery.data === null,

    goBack: () => navigate(-1),

    convocation,
    teamName: teamQuery.data?.name,
    sectionName: sectionQuery.data?.name,
    matchDetails: detailedConvocationQuery.data?.matchDetails ?? null,
    opponent: detailedConvocationQuery.data?.opponent ?? null,
    meetingDetails: detailedConvocationQuery.data?.meetingDetails ?? null,

    activeTab,
    setActiveTab,

    activeRole,
    roleMatchesConvocationTeam,

    canRespond,
    playerResponse,
    respondError,
    onRespondPresent,
    onRespondAbsent,

    self: {
      name: user?.fullName ?? '',
      position: user?.position ?? null,
    },
    others,

    coachRoster: rosterForCoachQuery.data?.roster ?? [],
    responseCounts: rosterForCoachQuery.data?.responseCounts,

    canValidateAttendance,
    savingUserId,
    attendanceErrorByUserId,
    onConfirmAttendancePresent,
    onConfirmAttendanceAbsent,

    // specs/player-vote.md — plain data/state only; ConvocationDetailPage.tsx
    // composes this into the `VoteCategoryViewModel[]` VotesTab actually
    // renders (icon JSX, `Badge` elements), since that composition needs
    // JSX and this hook is a .ts file (see the comment above
    // POSITIVE_VOTE_CATEGORY_ID). PO-PV-06 (voting window/closed state)
    // stays unresolved — no "votes closed" state is composed anywhere yet.
    votes: {
      categoryId: POSITIVE_VOTE_CATEGORY_ID,
      // `null` while voteCategoryQuery hasn't resolved yet — callers already
      // branch on `isLoading` below before rendering this.
      categoryLabel: voteCategoryQuery.data?.label ?? null,
      canCastVote,
      candidates: voteCandidates,
      myVote: myVoteQuery.data ?? null,
      tally: voteTallyQuery.data ?? null,
      isLoading: myVoteQuery.isLoading || voteTallyQuery.isLoading || voteCategoryQuery.isLoading,
      error: myVoteQuery.error ?? voteTallyQuery.error ?? voteCategoryQuery.error,
      isEditingVote,
      onChangeVote,
      selectedCandidateId: voteSelectedCandidateId,
      onSelectCandidate: setVoteSelectedCandidateId,
      onSubmit: onSubmitVote,
      isSubmitting: castVoteMutation.isPending,
      submitError: voteSubmitError,
    },
  }
}
