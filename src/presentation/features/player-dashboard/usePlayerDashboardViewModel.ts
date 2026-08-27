import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { DeclaredStatus } from '@domain/entities/convocation'
import type { UpcomingConvocationForPlayer } from '@domain/usecases/player-dashboard/ListUpcomingConvocationsForPlayerUseCase'
import { canPlayerRespond } from '@domain/policies/response-deadline'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { getFirstName, getInitials } from '@presentation/shared/formatters/greeting'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'
import { usePlayerDashboardDependencies } from '@presentation/di/hooks/use-player-dashboard-dependencies'
import { hasMissingOrRejectedDocument } from '@domain/rules/document-rules'

export function usePlayerDashboardViewModel() {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { toggleActiveRole } = useActiveRole()
  const {
    getPlayerTeamUseCase,
    listUpcomingConvocationsForPlayerUseCase,
    respondToConvocationUseCase,
    listUserMissingOrRejectedDocumentsUseCase,
  } = usePlayerDashboardDependencies()
  const { signOutUseCase } = useAuthDependencies()

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

  const upcomingConvocations = upcomingConvocationsQuery.data ?? []
  const nextConvocation: UpcomingConvocationForPlayer | undefined = upcomingConvocations[0]
  const upcomingList: UpcomingConvocationForPlayer[] = upcomingConvocations.filter((c) => c !== nextConvocation)

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
  const canRespond = hasRbacPermission && !!nextConvocation && canPlayerRespond(nextConvocation.convocation, now)

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
    onSuccess: () => {
      setRespondError(null)
      // AC-PD-04 — the button/status must flip immediately after a
      // successful response, same invalidateQueries shape as
      // useCreateConvocationViewModel's onSuccess.
      if (teamId && user) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.playerUpcomingConvocations(teamId, user.id) })
      }
    },
    onError: (error) => {
      setRespondError(mapDomainErrorToUiError(error))
    },
  })

  return {
    isLoading: teamQuery.isLoading || upcomingConvocationsQuery.isLoading || documentsQuery.isLoading,
    error: teamQuery.error ?? upcomingConvocationsQuery.error ?? documentsQuery.error,

    /// --- Header ---
    firstName: user ? getFirstName(user.fullName) : '',
    initials: user ? getInitials(user.fullName) : '',
    teamName: teamQuery.data?.name,
    onRoleClick: toggleActiveRole,
    onLogout: () => {
      void signOutUseCase.execute()
    },

    /// --- "Document manquant" alert ---
    hasMissingDocument,
    goToDocuments: () => {
      // TODO: no /documents route exists yet — same stub-route situation
      // as goToCalendar below (UI design §2, "cet écran n'existe pas
      // encore dans router.tsx").
    },

    /// --- "Prochaine convocation" card ---
    nextConvocation,
    canRespond,
    respondError,
    onRespondPresent: () => respondMutation.mutate('present'),
    onRespondAbsent: () => respondMutation.mutate('absent'),

    /// --- "À venir" list ---
    upcomingList,
    goToCalendar: () => {
      // TODO: Calendrier route doesn't exist yet — same as
      // useCoachDashboardViewModel.goToCalendar (AC-PD-14 "Voir tout").
    },
    goToConvocationDetail: (_convocationId: string) => {
      // TODO: same as above — detail route belongs to Calendrier.
    },
  }
}
