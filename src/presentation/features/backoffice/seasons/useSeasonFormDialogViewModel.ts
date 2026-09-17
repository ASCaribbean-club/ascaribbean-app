import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Season } from '@domain/entities/season'
import { useSeasonsDependencies } from '@presentation/di/hooks/use-seasons-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

export type SeasonFormMode = 'create' | 'edit'

export interface SeasonFormValues {
  label: string
  startDate: string // yyyy-mm-dd, native <input type="date"> value
  endDate: string // yyyy-mm-dd
}

const EMPTY_VALUES: SeasonFormValues = { label: '', startDate: '', endDate: '' }

// AC-WS-24 — pre-filled from the edited row. season.startDate/endDate are
// used AS-IS, deliberately without routing them through
// toDateInputValue(new Date(...)) the way useNewsFormDialogViewModel does
// for publishedAt/expiresAt: those back timestamptz columns that genuinely
// need reconstructing into a local Date first. Season.startDate/endDate back
// a plain SQL `date` column (no time component) already serialized by
// PostgREST as exactly the "yyyy-mm-dd" shape a native <input type="date">
// expects — the same shape toDateInputValue would produce. Round-tripping
// through `new Date(dateOnlyString)` would actually be WRONG here: a
// date-only ISO string parses as UTC midnight per the JS spec, and
// toDateInputValue reads back LOCAL Y/M/D — for any timezone behind UTC
// (most of the Americas/Caribbean) that silently pre-fills the day before.
function toFormValues(season: Season | null): SeasonFormValues {
  if (!season) return EMPTY_VALUES
  return {
    label: season.label,
    startDate: season.startDate,
    endDate: season.endDate,
  }
}

interface UseSeasonFormDialogViewModelParams {
  mode: SeasonFormMode
  // null in 'create' mode; the row being edited in 'edit' mode — AC-WS-24,
  // pre-filled from it.
  season: Season | null
  onSuccess: () => void
}

// specs/web-seasons.md UI design, "Nouveau composant — dialogue de
// création/modification (SeasonFormDialog)": one hook backs both dialog
// modes — same remount-via-`key` pattern as useNewsFormDialogViewModel (see
// SeasonFormDialog.tsx and that hook's own comment for why: a
// `useState(() => toFormValues(season))` initializer that runs exactly once
// per dialog opening, no useEffect-driven reset that could clobber a
// half-typed form on an unrelated parent re-render).
export function useSeasonFormDialogViewModel({ mode, season, onSuccess }: UseSeasonFormDialogViewModelParams) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { createSeasonUseCase, updateSeasonUseCase } = useSeasonsDependencies()

  const [values, setValues] = useState<SeasonFormValues>(() => toFormValues(season))

  function setField<K extends keyof SeasonFormValues>(key: K, value: SeasonFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
  }

  const mutation = useMutation({
    mutationFn: () => {
      if (!user) {
        // Unreachable in practice — RequireBackofficeAccess already gated
        // this screen on an admin session — but keeps the mutationFn total
        // rather than calling a use case with an empty actorId.
        throw new Error('No authenticated admin session.')
      }

      if (mode === 'create') {
        return createSeasonUseCase.execute({
          actorId: user.id,
          label: values.label,
          startDate: values.startDate,
          endDate: values.endDate,
        })
      }

      // mode === 'edit': `season` is guaranteed non-null by SeasonFormDialog's
      // own prop typing (edit mode always carries the row being edited).
      return updateSeasonUseCase.execute({
        actorId: user.id,
        seasonId: season!.id,
        label: values.label,
        startDate: values.startDate,
        endDate: values.endDate,
      })
    },
    onSuccess: () => {
      // AC-WS-22 — centralized queryKeys, invalidated so the list reflects
      // the change without a manual page reload. seasonCurrent is invalidated
      // too: modifying the current season's own bounds changes what
      // current_season() resolves for every coach's dashboard (§4) — see
      // that key's own comment in query-keys.ts for why no OTHER feature's
      // key is enumerated here individually.
      void queryClient.invalidateQueries({ queryKey: queryKeys.seasonsAdminList() })
      void queryClient.invalidateQueries({ queryKey: queryKeys.seasonCurrent() })
      onSuccess()
    },
  })

  const canSubmit = !!values.label.trim() && !!values.startDate && !!values.endDate && !mutation.isPending

  // AC-WS-23 — on failure the dialog stays open with the typed values
  // untouched (no reset happens anywhere on error, only on the successful
  // path above), and shows a French message translated from the
  // DomainError, never a raw Supabase message. The most likely failure here
  // is OverlappingSeasonError's already-existing inline message (§7 of the
  // spec) — this mapping isn't written twice, mapDomainErrorToUiError is the
  // single place deciding it.
  const errorMessage = mutation.error ? mapDomainErrorToUiError(mutation.error).message : null

  return {
    values,
    setLabel: (value: string) => setField('label', value),
    setStartDate: (value: string) => setField('startDate', value),
    setEndDate: (value: string) => setField('endDate', value),

    canSubmit,
    isSubmitting: mutation.isPending,
    errorMessage,
    submit: () => mutation.mutate(),
  }
}
