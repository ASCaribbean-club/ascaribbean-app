import { useState } from 'react'
import { useMutation, useQueryClient } from '@tanstack/react-query'
import type { Unavailability } from '@domain/entities/unavailability'
import { toLocalIsoDate } from '@domain/policies/availability'
import type { UnavailabilityDraft } from '@domain/usecases/team-availability/unavailability-draft'
import { useTeamAvailabilityDependencies } from '@presentation/di/hooks/use-team-availability-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'
import type { EditableKind } from './useAvailabilityEditViewModel'

// Form fields are strings (native inputs); the use case validates the shape.
export interface UnavailabilityFormValues {
  startsOn: string
  // medical: expected return; suspension: lift date. Same slot, one input.
  endsOn: string
  matchCount: string
  reason: string
}

function initialValues(existing: Unavailability | undefined, today: string): UnavailabilityFormValues {
  if (!existing) return { startsOn: today, endsOn: '', matchCount: '1', reason: '' }
  if (existing.kind === 'medical') {
    return { startsOn: existing.startsOn, endsOn: existing.expectedReturnOn ?? '', matchCount: '1', reason: '' }
  }
  return { startsOn: existing.startsOn, endsOn: existing.liftedOn ?? '', matchCount: String(existing.matchCount), reason: existing.reason ?? '' }
}

interface Params {
  teamId: string
  playerId: string
  kinds: EditableKind[]
  active: Unavailability[]
  onDone: () => void
}

// Same remount-via-state-initializer pattern as useTrainingLocationFormDialogViewModel:
// values are seeded once per sheet opening. One value set per kind, so
// switching Malade/Blessé <-> Suspension never loses what was typed.
export function useUnavailabilityFormViewModel({ teamId, playerId, kinds, active, onDone }: Params) {
  const { user } = useAuth()
  const queryClient = useQueryClient()
  const { declareUnavailabilityUseCase, updateUnavailabilityUseCase, liftUnavailabilityUseCase } = useTeamAvailabilityDependencies()

  const existingOf = (kind: EditableKind) => active.find((u) => u.kind === kind)
  // Open on the kind that is already active (medical wins, like the status badge).
  const [kind, setKind] = useState<EditableKind>(() => kinds.find((k) => existingOf(k)) ?? kinds[0])
  const [valuesByKind, setValuesByKind] = useState<Record<EditableKind, UnavailabilityFormValues>>(() => {
    const today = toLocalIsoDate(new Date())
    return { medical: initialValues(existingOf('medical'), today), suspension: initialValues(existingOf('suspension'), today) }
  })

  const values = valuesByKind[kind]
  const existing = existingOf(kind)
  const setField = (field: keyof UnavailabilityFormValues, value: string) =>
    setValuesByKind((current) => ({ ...current, [kind]: { ...current[kind], [field]: value } }))

  const refresh = () => {
    void queryClient.invalidateQueries({ queryKey: queryKeys.teamAvailability(teamId) })
    void queryClient.invalidateQueries({ queryKey: queryKeys.playerUnavailabilities(playerId) })
    onDone()
  }

  const saveMutation = useMutation({
    mutationFn: () => {
      if (!user) throw new Error('No authenticated session.')
      const end = values.endsOn === '' ? null : values.endsOn
      const draft: UnavailabilityDraft =
        kind === 'medical'
          ? { kind, startsOn: values.startsOn, expectedReturnOn: end }
          : { kind, startsOn: values.startsOn, matchCount: Number(values.matchCount), reason: values.reason, liftedOn: end }
      return existing
        ? updateUnavailabilityUseCase.execute({ user, teamId, existing, draft })
        : declareUnavailabilityUseCase.execute({ user, teamId, playerId, draft, now: new Date() })
    },
    onSuccess: refresh,
  })

  const liftMutation = useMutation({
    mutationFn: () => {
      if (!user || !existing) throw new Error('Nothing to lift.')
      return liftUnavailabilityUseCase.execute({ user, teamId, existing, now: new Date() })
    },
    onSuccess: refresh,
  })

  const isPending = saveMutation.isPending || liftMutation.isPending
  const error = saveMutation.error ?? liftMutation.error

  return {
    kinds,
    kind,
    setKind,
    isEditing: !!existing,
    values,
    setStartsOn: (value: string) => setField('startsOn', value),
    setEndsOn: (value: string) => setField('endsOn', value),
    setMatchCount: (value: string) => setField('matchCount', value),
    setReason: (value: string) => setField('reason', value),

    // Presence only; real validation belongs to the use case.
    canSubmit: values.startsOn !== '' && (kind === 'medical' || values.matchCount !== '') && !isPending,
    // "Marquer disponible" only makes sense on an existing active record.
    canLift: !!existing && !isPending,
    isPending,
    errorMessage: error ? mapDomainErrorToUiError(error).message : null,
    submit: () => saveMutation.mutate(),
    lift: () => liftMutation.mutate(),
  }
}
