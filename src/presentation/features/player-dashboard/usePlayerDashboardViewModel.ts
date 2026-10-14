import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DeclaredStatus } from '@domain/entities/convocation'
import type { ConvocationForPlayer } from '@/domain/usecases/player-dashboard/ListUConvocationsForPlayerUseCase'
import type { PendingVoteReminder } from '@domain/usecases/player-vote/GetPendingVoteReminderUseCase'
import { DomainError } from '@domain/errors/domain-error'
import { canPlayerRespond, getResponseDeadline } from '@domain/policies/response-deadline'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { getFirstName, getInitials } from '@presentation/shared/formatters/greeting'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { useObservability } from '@presentation/di/hooks/use-observability'
import { toConvocationAnalytics } from '@presentation/shared/observability/convocation-analytics'
import { shouldReportError } from '@presentation/shared/observability/should-report-error'
import { usePlayerDashboardDependencies } from '@presentation/di/hooks/use-player-dashboard-dependencies'
import { hasMissingOrRejectedDocument } from '@domain/rules/document-rules'
import { useNavigate } from 'react-router-dom'

// Same fixed category as useConvocationDetailViewModel (PO-PV-03).
const POSITIVE_VOTE_CATEGORY_ID = 'man_of_the_match'

function formatDaysLeftToVote(daysRemaining: number): string {
  return `Plus que ${daysRemaining} jour${daysRemaining > 1 ? 's' : ''} pour voter`
}

// Two lines: "vs AS Rivale · Score 2-1" (opponent and score left out when
// unknown — no details / score not recorded yet), then the date on its own.
function formatPendingVoteMatchRecap(reminder: PendingVoteReminder): { matchLine: string | null; dateLine: string } {
  const matchLine = [
    reminder.opponentName ? `vs ${reminder.opponentName}` : null,
    reminder.goalsFor !== null && reminder.goalsAgainst !== null ? `Score ${reminder.goalsFor}-${reminder.goalsAgainst}` : null,
  ].filter((part): part is string => part !== null).join(' · ')

  return {
    matchLine: matchLine || null,
    dateLine: new Date(reminder.kickoff).toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long' }),
  }
}

export function usePlayerDashboardViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const observability = useObservability()
  const {
    getPlayerTeamUseCase,
    listUpcomingConvocationsForPlayerUseCase,
    respondToConvocationUseCase,
    listUserMissingOrRejectedDocumentsUseCase,
    getTeamRecentFormUseCase,
    listConvocationMissionsUseCase,
    getPendingVoteReminderUseCase,
    getTeamMvpUseCase,
  } = usePlayerDashboardDependencies()

  // The 'player' RoleAssignment carries a single teamId (domain/entities/
  // user.ts, "one team per player") — no array/selector logic needed here,
  // unlike useCoachDashboardViewModel's coachTeamIds.
  const playerAssignment = user?.roles.find((assignment) => assignment.role === 'player')
  const teamId = playerAssignment?.teamId

  const teamQuery = useQuery({
    queryKey: queryKeys.playerTeam(teamId ?? ''),
    queryFn: () => getPlayerTeamUseCase.execute({ teamId: teamId! }),
    enabled: !!teamId,
  })

  const upcomingConvocationsQuery = useQuery({
    queryKey: queryKeys.playerUpcomingConvocations(teamId ?? '', user?.id ?? ''),
    queryFn: () =>
      listUpcomingConvocationsForPlayerUseCase.execute({ teamId: teamId!, userId: user!.id, now: new Date() }),
    enabled: !!teamId && !!user,
  })

  const documentsQuery = useQuery({
    queryKey: queryKeys.userMissingOrRejectedDocuments(user?.id ?? ''),
    queryFn: () => listUserMissingOrRejectedDocumentsUseCase.execute({ userId: user!.id }),
    enabled: !!user,
  })

  // specs/player-dashboard.md PO-PD-07, resolved 2026-09-30 — real team
  // data now that specs/match-stats.md exists. Team-scoped, same use case
  // and shared component as the coach dashboard's equivalent block
  // (PO-PD-02, the player's own AttendanceRecord access, stays open and out
  // of scope — this only covers the goals/form half of the old "Mes stats"
  // mockup block).
  const teamRecentFormQuery = useQuery({
    queryKey: queryKeys.teamRecentForm(teamId ?? ''),
    queryFn: () => getTeamRecentFormUseCase.execute({ teamId: teamId! }),
    enabled: !!teamId,
  })

  // Reminder to elect the man of the match until the player votes or the
  // voting window ends. Like missions below, deliberately NOT part of
  // isLoading/error: a failing read just hides the banner. `now` ticks every
  // minute, so the query re-runs when the window crosses a day boundary.
  const pendingVoteQuery = useQuery({
    queryKey: queryKeys.playerPendingVoteReminder(teamId ?? '', user?.id ?? ''),
    queryFn: () => getPendingVoteReminderUseCase.execute({
      teamId: teamId!,
      userId: user!.id,
      categoryId: POSITIVE_VOTE_CATEGORY_ID,
      now: new Date(),
    }),
    enabled: !!teamId && !!user,
  })

  // Star next to the first name while the player is the team's current MVP.
  // Like the reminder, not part of isLoading/error: a failing read hides it.
  const mvpQuery = useQuery({
    queryKey: queryKeys.teamMvp(teamId ?? ''),
    queryFn: () => getTeamMvpUseCase.execute({ teamId: teamId!, categoryId: POSITIVE_VOTE_CATEGORY_ID }),
    enabled: !!teamId,
  })
  const isMvp = !!user && (mvpQuery.data ?? []).includes(user.id)

  const upcomingConvocations = upcomingConvocationsQuery.data ?? []
  const nextConvocation: ConvocationForPlayer | undefined = upcomingConvocations[0]
  const upcomingList: ConvocationForPlayer[] = upcomingConvocations.filter((c) => c !== nextConvocation)

  // specs/match-details-missions.md AC-MM-23 — the player's own missions on
  // the next convocation. Deliberately NOT part of isLoading/error above: a
  // failing or slow missions read must never hide the card, the line is then
  // simply absent.
  const nextConvocationId = nextConvocation?.convocation.id
  const missionsQuery = useQuery({
    queryKey: queryKeys.convocationMissions(nextConvocationId ?? ''),
    queryFn: () => listConvocationMissionsUseCase.execute(nextConvocationId!),
    enabled: !!nextConvocationId,
  })
  // PO-MM-11 (open): every label is listed, comma-separated, until decided.
  // Null (not an empty string) when the player has no mission: nothing renders.
  const myMissionLabels = (missionsQuery.data ?? [])
    .filter((entry) => entry.assignees.some((assignee) => assignee.userId === user?.id))
    .map((entry) => entry.mission.label)
  const missionsLine = myMissionLabels.length > 0 ? myMissionLabels.join(', ') : null

  const hasMissingDocument = hasMissingOrRejectedDocument(documentsQuery.data ?? [])

  // Ticks every minute so canRespond re-evaluates once the response window
  // closes mid-session, instead of only on the next unrelated re-render —
  // RESPONSE_DEADLINE_MINUTES (response-deadline.ts) is minute-grained, so
  // a minute tick is enough resolution.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // AC-PD-06 — RBAC (usePermission: "is this a player on this team") ANDed
  // with the response-deadline window (canPlayerRespond, domain/policies/
  // response-deadline.ts). Without a nextConvocation yet, there's nothing
  // to respond to, so the window half defaults to false.
  const hasRbacPermission = usePermission('convocation:respond', { teamId })
  // specs/convocation-player-selection.md PO-CPS-03 (hypothesis) — a convocation
  // the player is not convoked to is never "à répondre".
  const isNotConvoked = !!nextConvocation && !nextConvocation.isConvoked
  const canRespond = hasRbacPermission && !!nextConvocation && !isNotConvoked && canPlayerRespond(nextConvocation.convocation, now)

  const [respondError, setRespondError] = useState<UiError | null>(null)

  const respondMutation = useMutation({
    mutationFn: (status: Extract<DeclaredStatus, 'present' | 'absent'>) => {

      if (!nextConvocation || !user) {
        return Promise.reject(new Error('no convocation to respond to yet'))
      }

      return respondToConvocationUseCase.execute({
        convocationId: nextConvocation.convocation.id,
        userId: user.id,
        status,
        now: new Date(),
      })
    },
    onMutate: () => setRespondError(null),
    onSuccess: (_result, status) => {
      setRespondError(null)
      if (nextConvocation) {
        const deadline = getResponseDeadline(nextConvocation.convocation.type, new Date(nextConvocation.convocation.date))
        observability.track({
          name: 'convocation_responded',
          props: {
            ...toConvocationAnalytics(nextConvocation.convocation),
            status,
            minutes_before_deadline: Math.round((deadline.getTime() - Date.now()) / 60_000),
            origin: 'dashboard',
          },
        })
      }
      // AC-PD-04 — the button/status must flip immediately after a
      // successful response, same invalidateQueries shape as
      // useCreateConvocationViewModel's onSuccess.
      if (teamId && user) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.playerUpcomingConvocations(teamId, user.id) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.playerConvocationResponse(nextConvocation.convocation.id, user.id) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.convocationResponders(nextConvocation.convocation.id) })
      }
    },
    onError: (error) => {
      setRespondError(mapDomainErrorToUiError(error))
      // Règle métier refusée (ex. réponse après la clôture) : signal produit,
      // pas un bug. Tout le reste (réseau, inconnu) est une erreur à remonter.
      if (shouldReportError(error)) {
        observability.reportError(error, { source: 'mutation', action: 'respond_to_convocation' })
      } else if (error instanceof DomainError) {
        if (nextConvocation) {
          observability.track({
            name: 'convocation_response_rejected',
            props: { ...toConvocationAnalytics(nextConvocation.convocation), error_class: error.name, origin: 'dashboard' },
          })
        }
      }
    },
  })

  return {
    isLoading: teamQuery.isLoading || upcomingConvocationsQuery.isLoading || documentsQuery.isLoading || teamRecentFormQuery.isLoading,
    error: teamQuery.error ?? upcomingConvocationsQuery.error ?? documentsQuery.error ?? teamRecentFormQuery.error,

    /// --- Header ---
    firstName: user ? getFirstName(user.fullName) : '',
    initials: user ? getInitials(user.fullName) : '',
    teamName: teamQuery.data?.name,
    isMvp,

    /// --- "Document manquant" alert ---
    hasMissingDocument,
    goToDocuments: () => {
      observability.track({ name: 'alert_clicked', props: { alert: 'missing_document' } })
      // TODO: no /documents route exists yet — same stub-route situation
      // as goToCalendar below (UI design §2, "cet écran n'existe pas
      // encore dans router.tsx").
    },

    /// --- "Élisez l'homme du match" alert ---
    pendingVote: pendingVoteQuery.data
      ? {
        daysLabel: formatDaysLeftToVote(pendingVoteQuery.data.daysRemaining),
        convocationId: pendingVoteQuery.data.convocationId,
        matchRecap: formatPendingVoteMatchRecap(pendingVoteQuery.data),
      }
      : null,
    goToVote: (convocationId: string) => {
      observability.track({ name: 'alert_clicked', props: { alert: 'pending_vote' } })
      navigate(`/convocations/${convocationId}?tab=votes`)
    },

    /// --- "Prochaine convocation" card ---
    nextConvocation,
    missionsLine,
    canRespond,
    isNotConvoked,
    respondError,
    // Guards against a duplicate upsert for the same convocation/status:
    // - respondMutation.isPending blocks a second tap while the first
    //   round trip is still in flight (before myResponse has refetched).
    // - the myResponse.status check blocks re-tapping the button that's
    //   already the player's recorded answer, even long after the mutation
    //   has settled — same status means the write would be a no-op, so
    //   there's no reason to re-hit the network (AC-PD-04, single upsert
    //   per actual change).
    onRespondPresent: () => {
      if (respondMutation.isPending || nextConvocation?.myResponse?.status === 'present') return
      respondMutation.mutate('present')
    },
    onRespondAbsent: () => {
      if (respondMutation.isPending || nextConvocation?.myResponse?.status === 'absent') return
      respondMutation.mutate('absent')
    },

    /// --- "Forme récente" / "Buts" row (PO-PD-07, resolved 2026-09-30) ---
    teamForm: teamRecentFormQuery.data?.form ?? [],
    teamGoalsFor: teamRecentFormQuery.data?.goalsFor ?? 0,
    teamGoalsAgainst: teamRecentFormQuery.data?.goalsAgainst ?? 0,

    /// --- "À venir" list ---
    upcomingList,
    goToCalendar: () => {
      // TODO: Calendrier route doesn't exist yet — same as
      // useCoachDashboardViewModel.goToCalendar (AC-PD-14 "Voir tout").
    },
    goToConvocationDetail: (convocationId: string) => {
      if (!convocationId) return
      navigate(`/convocations/${convocationId}`)
    },

    /// --- Avatar click (specs/profile-page.md, router course-correction
    // 2026-09-04: the avatar now opens the profile screen instead of a
    // sign-out confirmation directly here — sign-out moved to ProfilePage's
    // own avatar) ---
    goToProfilePage: () => {
      if (!user) return
      navigate(`/profile`)
    },
  }
}
