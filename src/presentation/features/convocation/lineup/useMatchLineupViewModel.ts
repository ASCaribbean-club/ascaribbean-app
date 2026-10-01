import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import type { ConvocationType } from '@domain/entities/convocation'
import type { Formation, LineupSlots } from '@domain/entities/match-lineup'
import type { SectionType } from '@domain/entities/section'
import {
  countEmptySlots,
  getAvailablePlayerIds,
  getLineupOpeningTime,
  isLineupOpeningFromFallback,
  isLineupSupported,
  isLineupVisibleToPlayer,
  placePlayer,
  placementsToSlots,
  swapSlots,
} from '@domain/policies/match-lineup-rules'
import type { ActiveDashboardRole } from '@domain/rules/active-role-scope'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'
import { toTimeInputValue } from '@presentation/shared/formatters/date-input'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/coach-match-composition.md UI design §7 — first composition opens on
// this formation, with eleven free slots.
const DEFAULT_FORMATION: Formation = '4-3-3'
const SAVE_ERROR_MESSAGE = 'Enregistrement impossible. Réessayez.'

export interface LineupSlotView {
  slotIndex: number
  // PO-MC-07 — the number on a token is the slot index + 1.
  number: number
  userId: string | null
  displayName: string | null
}

export interface LineupCandidateView {
  userId: string
  displayName: string
}

type PanelMode = 'menu' | 'swap' | 'replace'

interface MatchLineupViewModelParams {
  convocationId: string | undefined
  teamId: string | undefined
  convocationType: ConvocationType | undefined
  kickoff: string | undefined
  meetingPointTime: string | null
  sectionType: SectionType | undefined
  activeRole: ActiveDashboardRole
  roleMatchesConvocationTeam: boolean
  isTabActive: boolean
  now: Date
  onLeave: () => void
}

// specs/coach-match-composition.md — the "Composition" tab's ViewModel. Lives
// in the PAGE-level hook tree (called from useConvocationDetailViewModel),
// not in the tab's components: Radix unmounts an inactive tab, and the draft
// (formation, slots, selection) must survive a tab switch (UI design §4,
// "Persistance"). Every business rule it uses is a pure function of
// domain/policies/match-lineup-rules.ts; this hook only holds state around
// them and wires queries/mutations to the use cases.
export function useMatchLineupViewModel(params: MatchLineupViewModelParams) {
  const { convocationId, teamId, convocationType, kickoff, meetingPointTime, sectionType, activeRole, roleMatchesConvocationTeam } = params
  const { isTabActive, now, onLeave } = params
  const queryClient = useQueryClient()
  const { getMatchLineupUseCase, saveMatchLineupUseCase, listConvocationRespondersUseCase } = useConvocationDependencies()

  // AC-MC-03 — RBAC AND the active role, same multi-role guard as
  // canValidateAttendance/canEditMatchDetails. No time condition (PO-MC-05).
  const hasWritePermission = usePermission('match_lineup:write', { teamId })
  const isCoach = activeRole === 'coach'
  const canEdit = isCoach && roleMatchesConvocationTeam && hasWritePermission

  // AC-MC-01 — absent, never disabled.
  const isTabAvailable =
    !!convocationId && !!convocationType && isLineupSupported(convocationType, sectionType) && roleMatchesConvocationTeam

  // The window applies to players only (PO-MC-02); the database enforces it
  // for real, this only chooses between the waiting state and a query.
  const isWindowOpenForPlayer = !!kickoff && isLineupVisibleToPlayer(meetingPointTime, kickoff, now)
  const isWaiting = isTabAvailable && !isCoach && !isWindowOpenForPlayer
  const canRead = isTabAvailable && !isWaiting

  const lineupQuery = useQuery({
    queryKey: queryKeys.matchLineup(convocationId ?? ''),
    queryFn: () => getMatchLineupUseCase.execute(convocationId!),
    enabled: canRead && isTabActive,
  })
  const lineup = lineupQuery.data ?? null

  // PO-MC-04 — the placeable pool is the derived convoked roster, the same
  // read the Effectif tab uses (no second definition). The coach is never in
  // it (the RPC only lists players).
  const convokedQuery = useQuery({
    queryKey: queryKeys.convocationResponders(convocationId ?? ''),
    queryFn: () => listConvocationRespondersUseCase.execute(convocationId!),
    enabled: canRead && canEdit && isTabActive,
  })
  const convokedPlayers: LineupCandidateView[] = (convokedQuery.data ?? []).map((responder) => ({
    userId: responder.userId,
    displayName: responder.displayName,
  }))

  const baselineFormation: Formation = lineup?.formation ?? DEFAULT_FORMATION
  const baselineSlots: LineupSlots = placementsToSlots(lineup?.placements ?? [])

  const [isEditing, setIsEditing] = useState(false)
  const [draftFormation, setDraftFormation] = useState<Formation>(DEFAULT_FORMATION)
  const [draftSlots, setDraftSlots] = useState<LineupSlots>(baselineSlots)
  const [selection, setSelection] = useState<{ slotIndex: number; mode: PanelMode } | null>(null)
  const [saveError, setSaveError] = useState<string | null>(null)
  const [isLeavePending, setIsLeavePending] = useState(false)

  const formation = isEditing ? draftFormation : baselineFormation
  const slots = isEditing ? draftSlots : baselineSlots

  const nameByUserId: Record<string, string> = {}
  for (const player of convokedPlayers) nameByUserId[player.userId] = player.displayName
  for (const placement of lineup?.placements ?? []) nameByUserId[placement.userId] = placement.displayName

  const slotViews: LineupSlotView[] = slots.map((userId, slotIndex) => ({
    slotIndex,
    number: slotIndex + 1,
    userId,
    displayName: userId ? (nameByUserId[userId] ?? '—') : null,
  }))

  const emptySlotCount = countEmptySlots(slots)

  const hasUnsavedChanges =
    isEditing && (draftFormation !== baselineFormation || draftSlots.some((userId, index) => userId !== baselineSlots[index]))

  function startEditing() {
    if (!canEdit) return
    setDraftFormation(baselineFormation)
    setDraftSlots(baselineSlots)
    setSelection(null)
    setSaveError(null)
    setIsEditing(true)
  }

  function stopEditing() {
    setIsEditing(false)
    setSelection(null)
    setSaveError(null)
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!convocationId) return Promise.reject(new Error('no convocation to save a lineup for yet'))
      return saveMatchLineupUseCase.execute({ convocationId, formation: draftFormation, slots: draftSlots })
    },
    onMutate: () => setSaveError(null),
    onSuccess: async () => {
      // Wait for the refetch so reading mode never flashes the old lineup.
      if (convocationId) await queryClient.invalidateQueries({ queryKey: queryKeys.matchLineup(convocationId) })
      stopEditing()
    },
    // UI design §4 — the edit mode stays open and the draft is kept.
    onError: () => setSaveError(SAVE_ERROR_MESSAGE),
  })

  // "Terminé" — nothing changed means nothing to write (AC-MC-08 would be a
  // no-op anyway). The use case itself skips an entirely empty lineup.
  function onDone() {
    if (saveMutation.isPending) return
    if (!hasUnsavedChanges) {
      stopEditing()
      return
    }
    saveMutation.mutate()
  }

  function onSelectFormation(next: Formation) {
    // AC-MC-04 — slots are untouched: nobody leaves the lineup.
    setDraftFormation(next)
  }

  function onSelectSlot(slotIndex: number) {
    if (!isEditing) return
    if (selection?.mode === 'swap') {
      if (slotIndex === selection.slotIndex) {
        setSelection(null)
        return
      }
      // AC-MC-05 — swap (or move onto a free slot), then close the panel.
      setDraftSlots(swapSlots(draftSlots, selection.slotIndex, slotIndex))
      setSelection(null)
      return
    }
    if (selection?.slotIndex === slotIndex) {
      setSelection(null)
      return
    }
    setSelection({ slotIndex, mode: 'menu' })
  }

  function onClosePanel() {
    setSelection(null)
  }

  function onToggleSwap() {
    setSelection((current) => (current ? { ...current, mode: current.mode === 'swap' ? 'menu' : 'swap' } : current))
  }

  function onToggleReplace() {
    setSelection((current) => (current ? { ...current, mode: current.mode === 'replace' ? 'menu' : 'replace' } : current))
  }

  function onPickPlayer(userId: string) {
    if (!selection) return
    // AC-MC-06 — replaced player leaves the field; a free slot just fills.
    setDraftSlots(placePlayer(draftSlots, selection.slotIndex, userId))
    setSelection(null)
  }

  // Back navigation (UI design §4, Q-UI-2): guard unsaved changes.
  function requestLeave() {
    if (hasUnsavedChanges) {
      setIsLeavePending(true)
      return
    }
    onLeave()
  }
  function confirmLeave() {
    setIsLeavePending(false)
    onLeave()
  }
  function cancelLeave() {
    setIsLeavePending(false)
  }

  const selectedSlot = selection ? slotViews[selection.slotIndex] : null
  const availablePlayers: LineupCandidateView[] = getAvailablePlayerIds(
    convokedPlayers.map((player) => player.userId),
    slots,
  ).map((userId) => ({ userId, displayName: nameByUserId[userId] ?? '—' }))

  const panel = selectedSlot
    ? {
        slotIndex: selectedSlot.slotIndex,
        number: selectedSlot.number,
        displayName: selectedSlot.displayName,
        isEmptySlot: selectedSlot.userId === null,
        mode: selection!.mode,
        availablePlayers,
      }
    : null

  // Waiting copy (AC-MC-10) — the time is computed, never frozen text, and
  // the no-RDV fallback never mentions a rendez-vous (PO-MC-12).
  let waitingMessage: string | null = null
  if (isWaiting && kickoff) {
    const openingTime = toTimeInputValue(getLineupOpeningTime(meetingPointTime, kickoff))
    waitingMessage = isLineupOpeningFromFallback(meetingPointTime)
      ? `La composition sera disponible à ${openingTime}, une heure avant le coup d’envoi.`
      : `La composition sera disponible à l’heure du rendez-vous, à ${openingTime}.`
  }

  let status: 'waiting' | 'loading' | 'error' | 'empty' | 'ready'
  if (isWaiting) status = 'waiting'
  else if (lineupQuery.isLoading || (isEditing && convokedQuery.isLoading)) status = 'loading'
  else if (lineupQuery.error || (isEditing && convokedQuery.error)) status = 'error'
  else if (!lineup && !isEditing) status = 'empty'
  else status = 'ready'

  let bannerText: string | null = null
  if (panel?.mode === 'swap') {
    bannerText = 'Touchez un autre joueur pour échanger les positions.'
  } else if (canEdit && emptySlotCount > 0) {
    bannerText = `Composition incomplète : ${emptySlotCount} poste(s) à pourvoir.`
  } else if (isEditing) {
    bannerText = 'Touchez un joueur sur le terrain pour changer sa position ou le remplacer.'
  }

  return {
    isTabAvailable,
    status,
    waitingMessage,
    onRetry: () => void lineupQuery.refetch(),

    title: `COMPOSITION — ${formation}`,
    formation,
    slots: slotViews,
    bannerText,

    canEdit,
    isEditing,
    onStartEditing: startEditing,
    onDone,
    isSaving: saveMutation.isPending,
    saveError,

    onSelectFormation,
    selectedSlotIndex: selection?.slotIndex ?? null,
    onSelectSlot,
    panel,
    onClosePanel,
    onToggleSwap,
    onToggleReplace,
    onPickPlayer,

    hasUnsavedChanges,
    isLeavePending,
    requestLeave,
    confirmLeave,
    cancelLeave,
  }
}

export type MatchLineupViewModel = ReturnType<typeof useMatchLineupViewModel>
