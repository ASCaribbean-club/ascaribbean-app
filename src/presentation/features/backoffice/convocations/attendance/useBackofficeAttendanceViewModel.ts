import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { ActualStatus } from '@domain/entities/convocation'
import { AttendanceWindowClosedError } from '@domain/errors/attendance-window-closed-error'
import { diffAttendance } from '@domain/rules/attendance-batch'
import { useConvocationAdminDependencies } from '@presentation/di/hooks/use-convocation-admin-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import { formatConvocationDate } from '../format-convocation-date'

const LIST_PATH = '/admin/convocations'
const SAVE_ERROR_MESSAGE = 'Les présences n’ont pas pu être enregistrées. Réessayez.'

// specs/web-create-convocation.md UI design "Écran 4" — local choices on top of
// the loaded sheet, changed lines = domain diffAttendance (AC-WC-27). Never
// pre-filled from a declared response (the sheet is built from
// AttendanceRecord rows only).
export function useBackofficeAttendanceViewModel(convocationId: string) {
  const { getAdminAttendanceSheetUseCase, recordAttendanceByAdminUseCase } = useConvocationAdminDependencies()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()

  const [choices, setChoices] = useState<Record<string, ActualStatus>>({})
  const [isDiscardOpen, setIsDiscardOpen] = useState(false)
  const [saveError, setSaveError] = useState<string | null>(null)

  const sheetQuery = useQuery({
    queryKey: queryKeys.adminAttendanceSheet(convocationId),
    queryFn: () => getAdminAttendanceSheetUseCase.execute(convocationId, new Date()),
  })
  const sheet = sheetQuery.data ?? null

  const storedStatuses = new Map<string, ActualStatus>(
    (sheet?.players ?? []).flatMap((player) => (player.actualStatus ? [[player.userId, player.actualStatus] as const] : [])),
  )
  const changes = diffAttendance(
    storedStatuses,
    Object.entries(choices).map(([userId, actualStatus]) => ({
      userId,
      actualStatus,
    })),
  )

  const players = (sheet?.players ?? []).map((player) => ({
    userId: player.userId,
    displayName: player.displayName,
    // Chosen value wins over the stored one; null = "Non saisi".
    status: choices[player.userId] ?? player.actualStatus,
  }))

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated user')
      return recordAttendanceByAdminUseCase.execute({
        actorId: user.id,
        convocationId,
        choices: changes.map(({ userId, actualStatus }) => ({
          userId,
          actualStatus,
        })),
        now: new Date(),
      })
    },
    onSuccess: async () => {
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.adminConvocationsRoot(),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.convocationsRoot(),
        }),
      ])
      navigate(LIST_PATH)
    },
    onError: (error) => {
      setSaveError(error instanceof AttendanceWindowClosedError ? mapDomainErrorToUiError(error).message : SAVE_ERROR_MESSAGE)
    },
  })

  const hasChanges = changes.length > 0

  return {
    isLoading: sheetQuery.isLoading,
    loadError: sheetQuery.error ? mapDomainErrorToUiError(sheetQuery.error) : null,
    notFound: !sheetQuery.isLoading && !sheetQuery.error && sheet === null,
    retry: () => {
      void sheetQuery.refetch()
    },
    canEnter: sheet?.canEnter ?? false,
    isEmptyRoster: !!sheet && sheet.canEnter && sheet.players.length === 0,
    subtitle: sheet ? `${sheet.teamName} · ${formatConvocationDate(sheet.convocation.date)}` : '',
    showAlreadyEnteredHint: !!sheet?.hasStoredRecords,
    players,
    changedCount: changes.length,
    hasChanges,
    isSaving: mutation.isPending,
    saveError,
    // Switching Présent <-> Absent only; the active segment can't be cleared.
    choose: (userId: string, status: ActualStatus) => {
      setSaveError(null)
      setChoices((current) => ({ ...current, [userId]: status }))
    },
    save: () => {
      if (!hasChanges) return
      mutation.mutate()
    },
    // "Plus tard" writes nothing; asks first only when something changed.
    later: () => (hasChanges ? setIsDiscardOpen(true) : navigate(LIST_PATH)),
    back: () => (hasChanges ? setIsDiscardOpen(true) : navigate(LIST_PATH)),
    isDiscardOpen,
    keepEditing: () => setIsDiscardOpen(false),
    discard: () => navigate(LIST_PATH),
    goToList: () => navigate(LIST_PATH),
  }
}

export type BackofficeAttendanceViewModel = ReturnType<typeof useBackofficeAttendanceViewModel>
