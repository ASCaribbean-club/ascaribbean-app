import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { Convocation } from '@domain/entities/convocation'
import type { ConvocationMissionWithAssignees } from '@domain/entities/convocation-mission'
import { can } from '@domain/policies/can'
import { isMissionSelfServiceOpen } from '@domain/policies/mission-deadline'
import { MAX_MISSION_CAPACITY, MIN_MISSION_CAPACITY, isValidMissionLabel } from '@domain/policies/mission-rules'
import type { ActiveDashboardRole } from '@domain/rules/active-role-scope'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export interface MissionAssigneeView {
  userId: string
  // PO-MM-10 (open): full name as returned by the RPC; the current user is
  // labelled "Vous" on the player variant only.
  displayName: string
  isMe: boolean
  role: MissionRole
}

export interface MissionMemberView {
  userId: string
  displayName: string
  role: MissionRole
}

// Only team players are eligible this pass (PO-MM-06), so every person shown is
// a 'player'. 'volunteer' is rendered by RoleBadge for the volunteer pass.
export type MissionRole = 'player' | 'volunteer'

// Pending inline confirmation on one card (specs UI design: one at a time in
// the whole tab).
export interface MissionConfirmationView {
  message: string
  isSubmitting: boolean
  onConfirm: () => void
  onCancel: () => void
}

export interface MissionView {
  id: string
  label: string
  capacity: number
  assignedCount: number
  isFull: boolean
  assignees: MissionAssigneeView[]
  isAssignedToMe: boolean
  // The four booleans are the ONLY contract with the component (AC-MM-18).
  canClaim: boolean
  canRelease: boolean
  canManage: boolean
  isClosed: boolean
  isBusy: boolean
  error: string | null
  onClaim: () => void
  onRelease: () => void
  onRequestRemoveMission: () => void
  onRequestRemoveAssignee: (userId: string) => void
  confirmation: MissionConfirmationView | null
  // "Choisir un membre" panel — already filtered: eligible, not yet assigned.
  isPickerOpen: boolean
  canAssign: boolean
  pickerMembers: MissionMemberView[]
  onOpenPicker: () => void
  onClosePicker: () => void
  onAssign: (userId: string) => void
}

export interface AdHocMissionFormView {
  isOpen: boolean
  label: string
  capacity: number
  capacityOptions: number[]
  canSubmit: boolean
  isSubmitting: boolean
  error: string | null
  onOpen: () => void
  onCancel: () => void
  onChangeLabel: (label: string) => void
  onSelectCapacity: (capacity: number) => void
  onSubmit: () => void
}

interface MissionsViewModelParams {
  convocationId: string | undefined
  convocation: Convocation | undefined
  sectionId: string | undefined
  activeRole: ActiveDashboardRole
  roleMatchesConvocationTeam: boolean
  isTabActive: boolean
  now: Date
}

type PendingConfirmation = { kind: 'mission'; missionId: string } | { kind: 'member'; missionId: string; userId: string }

const CAPACITY_OPTIONS = Array.from({ length: MAX_MISSION_CAPACITY - MIN_MISSION_CAPACITY + 1 }, (_, index) => MIN_MISSION_CAPACITY + index)

// specs/match-details-missions.md §2.7 — the "Missions" tab ViewModel. Called
// from the page-level hook (like the lineup one) so the open panel/form
// state survives a tab switch. Every rule is a pure domain function (can(),
// isMissionSelfServiceOpen); this hook only combines them per mission and
// wires queries/mutations to the use cases.
export function useConvocationMissionsViewModel(params: MissionsViewModelParams) {
  const { convocationId, convocation, sectionId, activeRole, roleMatchesConvocationTeam, isTabActive, now } = params
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const {
    listConvocationMissionsUseCase,
    claimMissionUseCase,
    releaseMissionUseCase,
    assignMemberToMissionUseCase,
    removeMemberFromMissionUseCase,
    addAdHocMissionUseCase,
    removeMissionUseCase,
    listConvocationRespondersUseCase,
  } = useConvocationDependencies()

  const scope = { teamId: convocation?.teamId, sectionId }
  // Variant follows the ACTIVE role (same rule as the rest of the screen): a
  // multi-role account never sees both control sets at once.
  const hasManageRight = !!user && !!convocation && can(user, 'mission:manage', scope)
  const isManagerVariant = roleMatchesConvocationTeam && activeRole === 'coach' && hasManageRight
  const isPlayerVariant =
    roleMatchesConvocationTeam && activeRole === 'player' && !!user && !!convocation && can(user, 'mission:self-assign', scope)
  // R3/R4 — the deadline concerns players who do not hold 'mission:manage'.
  const isClosed = isPlayerVariant && !hasManageRight && !!convocation && !isMissionSelfServiceOpen(convocation, now)

  const missionsQuery = useQuery({
    queryKey: queryKeys.convocationMissions(convocationId ?? ''),
    queryFn: () => listConvocationMissionsUseCase.execute(convocationId!),
    enabled: !!convocationId && (isManagerVariant || isPlayerVariant),
  })
  const entries: ConvocationMissionWithAssignees[] = missionsQuery.data ?? []

  // Eligible members (PO-MM-06 assumption: the team's players), same read as
  // the Effectif tab. Only the manager's picker needs it.
  const membersQuery = useQuery({
    queryKey: queryKeys.convocationResponders(convocationId ?? ''),
    queryFn: () => listConvocationRespondersUseCase.execute(convocationId!),
    enabled: !!convocationId && isManagerVariant && isTabActive,
  })
  const eligibleMembers: MissionMemberView[] = (membersQuery.data ?? []).map((member) => ({
    userId: member.userId,
    displayName: member.displayName,
    role: 'player',
  }))

  const [pickerMissionId, setPickerMissionId] = useState<string | null>(null)
  const [confirmation, setConfirmation] = useState<PendingConfirmation | null>(null)
  const [errorByMissionId, setErrorByMissionId] = useState<Record<string, string>>({})
  const [isAdHocOpen, setIsAdHocOpen] = useState(false)
  const [adHocLabel, setAdHocLabel] = useState('')
  const [adHocCapacity, setAdHocCapacity] = useState(MIN_MISSION_CAPACITY)
  const [adHocError, setAdHocError] = useState<string | null>(null)

  function refresh() {
    void queryClient.invalidateQueries({ queryKey: queryKeys.convocationMissions(convocationId ?? '') })
  }

  function setMissionError(missionId: string, message: string | null) {
    setErrorByMissionId((current) => {
      const next = { ...current }
      if (message === null) delete next[missionId]
      else next[missionId] = message
      return next
    })
  }

  // One shape for the five per-mission mutations: clear that card's error
  // before, refresh the list after (also after a failure: a full mission or a
  // passed deadline is fixed by reloading), show the translated message on
  // failure and leave the previous state untouched (AC-MM-22).
  function missionMutationOptions(onSuccessExtra?: () => void) {
    return {
      onMutate: (variables: { missionId: string }) => setMissionError(variables.missionId, null),
      onSuccess: () => {
        onSuccessExtra?.()
        refresh()
      },
      onError: (error: unknown, variables: { missionId: string }) => {
        setMissionError(variables.missionId, mapDomainErrorToUiError(error).message)
        refresh()
      },
    }
  }

  const claimMutation = useMutation({
    mutationFn: (variables: { missionId: string }) =>
      claimMissionUseCase.execute({ actorId: user!.id, convocationId: convocationId!, missionId: variables.missionId }),
    ...missionMutationOptions(),
  })

  const releaseMutation = useMutation({
    mutationFn: (variables: { missionId: string }) =>
      releaseMissionUseCase.execute({ actorId: user!.id, convocationId: convocationId!, missionId: variables.missionId }),
    ...missionMutationOptions(),
  })

  const assignMutation = useMutation({
    mutationFn: (variables: { missionId: string; userId: string }) =>
      assignMemberToMissionUseCase.execute({
        actorId: user!.id,
        convocationId: convocationId!,
        missionId: variables.missionId,
        targetUserId: variables.userId,
      }),
    ...missionMutationOptions(() => setPickerMissionId(null)),
  })

  const removeMemberMutation = useMutation({
    mutationFn: (variables: { missionId: string; userId: string }) =>
      removeMemberFromMissionUseCase.execute({
        actorId: user!.id,
        convocationId: convocationId!,
        missionId: variables.missionId,
        targetUserId: variables.userId,
      }),
    ...missionMutationOptions(() => setConfirmation(null)),
  })

  const removeMissionMutation = useMutation({
    mutationFn: (variables: { missionId: string }) =>
      removeMissionUseCase.execute({ actorId: user!.id, convocationId: convocationId!, missionId: variables.missionId }),
    ...missionMutationOptions(() => setConfirmation(null)),
  })

  const addAdHocMutation = useMutation({
    mutationFn: () =>
      addAdHocMissionUseCase.execute({
        actorId: user!.id,
        convocationId: convocationId!,
        label: adHocLabel,
        capacity: adHocCapacity,
      }),
    onMutate: () => setAdHocError(null),
    onSuccess: () => {
      setIsAdHocOpen(false)
      setAdHocLabel('')
      setAdHocCapacity(MIN_MISSION_CAPACITY)
      refresh()
    },
    // The typed label is kept so the manager can retry (UI design).
    onError: (error) => setAdHocError(mapDomainErrorToUiError(error).message),
  })

  function closeTransientUi() {
    setPickerMissionId(null)
    setConfirmation(null)
  }

  const pendingMissionId =
    [claimMutation, releaseMutation, assignMutation, removeMemberMutation, removeMissionMutation].find((mutation) => mutation.isPending)
      ?.variables?.missionId ?? null

  const missions: MissionView[] = entries.map(({ mission, assignees }) => {
    const assignedCount = assignees.length
    const isFull = assignedCount >= mission.capacity
    const isAssignedToMe = !!user && assignees.some((assignee) => assignee.userId === user.id)
    const assignedIds = new Set(assignees.map((assignee) => assignee.userId))

    const pending = confirmation?.missionId === mission.id ? confirmation : null
    let missionConfirmation: MissionConfirmationView | null = null
    if (pending?.kind === 'mission') {
      missionConfirmation = {
        message: `${assignedCount} ${assignedCount > 1 ? 'personnes sont inscrites, elles seront retirées' : 'personne est inscrite, elle sera retirée'}.`,
        isSubmitting: removeMissionMutation.isPending,
        onConfirm: () => removeMissionMutation.mutate({ missionId: mission.id }),
        onCancel: () => setConfirmation(null),
      }
    } else if (pending?.kind === 'member') {
      const name = assignees.find((assignee) => assignee.userId === pending.userId)?.displayName ?? ''
      missionConfirmation = {
        message: `Retirer ${name} de cette mission ?`,
        isSubmitting: removeMemberMutation.isPending,
        onConfirm: () => removeMemberMutation.mutate({ missionId: mission.id, userId: pending.userId }),
        onCancel: () => setConfirmation(null),
      }
    }

    return {
      id: mission.id,
      label: mission.label,
      capacity: mission.capacity,
      assignedCount,
      isFull,
      assignees: assignees.map((assignee) => ({
        userId: assignee.userId,
        displayName: isPlayerVariant && assignee.userId === user?.id ? 'Vous' : assignee.displayName,
        isMe: assignee.userId === user?.id,
        role: 'player',
      })),
      isAssignedToMe,
      canClaim: isPlayerVariant && !isClosed && !isAssignedToMe && !isFull,
      canRelease: isPlayerVariant && !isClosed && isAssignedToMe,
      canManage: isManagerVariant,
      isClosed,
      isBusy: pendingMissionId === mission.id,
      error: errorByMissionId[mission.id] ?? null,
      onClaim: () => claimMutation.mutate({ missionId: mission.id }),
      onRelease: () => releaseMutation.mutate({ missionId: mission.id }),
      onRequestRemoveMission: () => {
        closeTransientUi()
        // No assignee: direct deletion, no confirmation (AC-MM-20).
        if (assignedCount === 0) removeMissionMutation.mutate({ missionId: mission.id })
        else setConfirmation({ kind: 'mission', missionId: mission.id })
      },
      onRequestRemoveAssignee: (userId) => {
        closeTransientUi()
        setConfirmation({ kind: 'member', missionId: mission.id, userId })
      },
      confirmation: missionConfirmation,
      isPickerOpen: pickerMissionId === mission.id,
      canAssign: isManagerVariant && !isFull,
      pickerMembers: eligibleMembers.filter((member) => !assignedIds.has(member.userId)),
      onOpenPicker: () => {
        closeTransientUi()
        setMissionError(mission.id, null)
        setPickerMissionId(mission.id)
      },
      onClosePicker: () => setPickerMissionId(null),
      onAssign: (userId) => assignMutation.mutate({ missionId: mission.id, userId }),
    }
  })

  const adHocForm: AdHocMissionFormView = {
    isOpen: isAdHocOpen,
    label: adHocLabel,
    capacity: adHocCapacity,
    capacityOptions: CAPACITY_OPTIONS,
    // The only disabled control of the feature: a form field rule, not a
    // permission (UI design).
    canSubmit: isValidMissionLabel(adHocLabel) && !addAdHocMutation.isPending,
    isSubmitting: addAdHocMutation.isPending,
    error: adHocError,
    onOpen: () => {
      closeTransientUi()
      setAdHocError(null)
      setIsAdHocOpen(true)
    },
    onCancel: () => {
      setIsAdHocOpen(false)
      setAdHocLabel('')
      setAdHocCapacity(MIN_MISSION_CAPACITY)
      setAdHocError(null)
    },
    onChangeLabel: setAdHocLabel,
    onSelectCapacity: setAdHocCapacity,
    onSubmit: () => {
      if (isValidMissionLabel(adHocLabel) && !addAdHocMutation.isPending) addAdHocMutation.mutate()
    },
  }

  // Absent, never disabled: no mission and nothing to manage -> no tab. A
  // failed read still shows the tab (with its error and retry) rather than
  // silently hiding it.
  const isTabAvailable = (isManagerVariant || isPlayerVariant) && (entries.length > 0 || isManagerVariant || !!missionsQuery.error)

  return {
    isTabAvailable,
    isLoading: missionsQuery.isLoading,
    // Never the raw Supabase/Postgres message (AC-MM-24).
    errorMessage: missionsQuery.error ? mapDomainErrorToUiError(missionsQuery.error).message : null,
    onRetry: () => void missionsQuery.refetch(),
    isEmpty: missionsQuery.isSuccess && entries.length === 0,
    // Player variant banner (AC-MM-19): deadline passed or convocation not open.
    showClosedBanner: isClosed,
    canManage: isManagerVariant,
    missions,
    adHocForm,
  }
}

export type ConvocationMissionsViewModel = ReturnType<typeof useConvocationMissionsViewModel>
