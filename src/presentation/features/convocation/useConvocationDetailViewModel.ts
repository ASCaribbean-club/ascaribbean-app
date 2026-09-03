import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useParams } from 'react-router-dom'
import type { DeclaredStatus } from '@domain/entities/convocation'
import { hasActiveRoleForConvocation } from '@domain/rules/active-role-scope'
import { canPlayerRespond } from '@domain/policies/response-deadline'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'

export type ConvocationDetailTab = 'infos' | 'effectif'

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
    getConvocationWithDetailsUseCase,
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    getConvocationResponseByUserUseCase,
    respondToConvocationUseCase,
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
    enabled: !!convocationId && activeRole === 'player' && activeTab === 'effectif',
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

  // "Reste de l'effectif" (RosterList's `others`) excludes the current user
  // — their own row is SelfRosterRow instead (UI design §"Nouveau composant
  // — liste Effectif": always first, "<nom> (moi)"). Plain identity
  // filter, not a business rule — kept here rather than in the component
  // per ARCHITECTURE.md §6 ("un composant ne calcule rien").
  const others = (respondersQuery.data ?? []).filter((responder) => responder.userId !== user?.id)

  return {
    isLoading: detailedConvocationQuery.isLoading,
    // Merges every query this screen depends on — a failure on any one of
    // them (roster, responders, player's own response, team name) is a
    // real error, not silently indistinguishable from "nobody has
    // responded yet" (others/coachRoster/responseCounts all fall back to
    // an empty default below). Same `??` merge shape as
    // usePlayerDashboardViewModel's `error`.
    error: detailedConvocationQuery.error ?? teamQuery.error ?? respondersQuery.error ?? playerResponseQuery.error ?? rosterForCoachQuery.error,
    // AC-MD-01 — `null` is the one
    // state ConvocationDetailPage renders NotFoundState for; a genuine
    // network/server error stays in `error` above instead.
    notFound: detailedConvocationQuery.isSuccess && detailedConvocationQuery.data === null,

    goBack: () => navigate(-1),

    convocation,
    teamName: teamQuery.data?.name,
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
  }
}
