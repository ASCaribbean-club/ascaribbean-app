import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { CompetitionType } from '@domain/entities/competition-type'
import type { Convocation } from '@domain/entities/convocation'
import { ConvocationAttendeeAddRefusedError } from '@domain/errors/convocation-attendee-add-refused-error'
import { ConvocationAttendeeCapExceededError } from '@domain/errors/convocation-attendee-cap-exceeded-error'
import { toLocalIsoDate } from '@domain/policies/availability'
import { canAddAnotherAttendee, getAttendeeCap, isAttendeeAddWindowOpen } from '@domain/policies/convocation-attendee-rules'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'
import { useTeamAvailabilityDependencies } from '@presentation/di/hooks/use-team-availability-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { describeUnavailability } from '../recipients-selection'

interface AddAttendeeParams {
  convocationId: string | undefined
  convocation: Convocation | undefined
  // match_details.competition_type, null for a training / meeting.
  competitionType: CompetitionType | null
  // Current number of convoked players (the coach roster, already loaded by
  // the Effectif tab this control lives in).
  convokedCount: number
  activeRole: string
  roleMatchesConvocationTeam: boolean
  now: Date
}

const GENERIC_ERROR = 'Impossible d’ajouter ce joueur. Réessayez.'

// specs/convocation-player-selection.md §4 — the "Convoquer un joueur" control
// of the Effectif tab (coach). Called from useConvocationDetailViewModel (page
// level) like the lineup / missions ViewModels. The component only branches on
// the booleans below; the decision `canAdd` composes the matrix
// ('convocation_attendee:add', team-scoped), the active role (multi-role
// accounts: absent, never greyed) and the add window (open + before kickoff,
// PO-CPS-06 — recomputed on the screen's minute tick).
export function useAddAttendeeViewModel(params: AddAttendeeParams) {
  const { convocationId, convocation, competitionType, convokedCount, activeRole, roleMatchesConvocationTeam, now } = params
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { listUnconvokedPlayersUseCase, addConvocationAttendeeUseCase } = useConvocationDependencies()
  const { getConvocationAvailabilityUseCase } = useTeamAvailabilityDependencies()

  const hasPermission = usePermission('convocation_attendee:add', { teamId: convocation?.teamId })
  const canAdd =
    !!convocation &&
    activeRole === 'coach' &&
    roleMatchesConvocationTeam &&
    hasPermission &&
    isAttendeeAddWindowOpen(convocation, now)

  const [isOpen, setIsOpen] = useState(false)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const playersQuery = useQuery({
    queryKey: queryKeys.convocationUnconvokedPlayers(convocationId ?? ''),
    queryFn: () => listUnconvokedPlayersUseCase.execute(convocationId!),
    enabled: !!convocationId && canAdd && isOpen,
  })

  // Who is out on the convocation's day can't be added (same rule as the
  // creation form). Fail closed: if availability can't be read the panel shows
  // its load error rather than offering a player who may be unavailable.
  const availabilityDay = convocation ? toLocalIsoDate(new Date(convocation.date)) : ''
  const availabilityQuery = useQuery({
    queryKey: queryKeys.convocationAvailability(convocation?.teamId ?? '', availabilityDay),
    queryFn: () => getConvocationAvailabilityUseCase.execute({ user: user!, teamId: convocation!.teamId, on: availabilityDay }),
    enabled: !!convocation && !!user && canAdd && isOpen,
  })
  const unavailability = availabilityQuery.data ?? {}

  const cap = convocation ? getAttendeeCap(convocation.type, competitionType) : null
  const capReached = !!convocation && !canAddAnotherAttendee(convokedCount, convocation.type, competitionType)

  const addMutation = useMutation({
    mutationFn: (userId: string) => {
      if (!convocationId || !user) return Promise.reject(new Error('no convocation to add a player to yet'))
      return addConvocationAttendeeUseCase.execute({ actorId: user.id, convocationId, userId })
    },
    onMutate: () => setErrorMessage(null),
    onSuccess: () => {
      setIsOpen(false)
      if (!convocationId) return
      // The new attendee shows up "en attente" in the Effectif; no response,
      // attendance or lineup row is created (AC-CPS-19), so those keys stay.
      void queryClient.invalidateQueries({ queryKey: queryKeys.convocationRosterForCoach(convocationId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.convocationResponders(convocationId) })
      void queryClient.invalidateQueries({ queryKey: queryKeys.convocationUnconvokedPlayers(convocationId) })
    },
    onError: (error) => {
      setErrorMessage(
        error instanceof ConvocationAttendeeCapExceededError || error instanceof ConvocationAttendeeAddRefusedError
          ? mapDomainErrorToUiError(error).message
          : GENERIC_ERROR,
      )
      // Reload so the list reflects the real state after a refusal.
      if (convocationId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.convocationUnconvokedPlayers(convocationId) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.convocationRosterForCoach(convocationId) })
      }
    },
  })

  function open() {
    setErrorMessage(null)
    setIsOpen(true)
  }
  function close() {
    if (addMutation.isPending) return
    setIsOpen(false)
    setErrorMessage(null)
  }
  function onPick(userId: string) {
    if (addMutation.isPending || unavailability[userId]) return
    addMutation.mutate(userId)
  }

  const players = (playersQuery.data ?? []).map((player) => ({
    ...player,
    unavailableLabel: unavailability[player.userId] ? describeUnavailability(unavailability[player.userId]) : null,
  }))

  return {
    canAdd,
    isOpen,
    open,
    close,
    onPick,
    // "N / 14 convoqués" header — official match only.
    counterLabel: cap === null ? null : `${convokedCount} / ${cap} convoqués`,
    // The cap is already reached: the panel explains, it lists nobody.
    capReached,
    capReachedMessage: cap === null ? null : `Match officiel : ${cap} convoqués au maximum. Impossible d’en ajouter un autre.`,
    isLoading: playersQuery.isLoading || availabilityQuery.isLoading,
    hasLoadError: playersQuery.isError || availabilityQuery.isError,
    retryLoad: () => {
      void playersQuery.refetch()
      void availabilityQuery.refetch()
    },
    players,
    hasNoPlayerToAdd: !playersQuery.isLoading && !playersQuery.isError && players.length === 0,
    pendingUserId: addMutation.isPending ? (addMutation.variables ?? null) : null,
    errorMessage,
  }
}

export type AddAttendeeViewModel = ReturnType<typeof useAddAttendeeViewModel>
