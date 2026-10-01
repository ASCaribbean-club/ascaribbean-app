import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { ConvocationType } from '@domain/entities/convocation'
import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { TrainingLocationArchivedError } from '@domain/errors/training-location-archived-error'
import { isConvocationEditable } from '@domain/policies/convocation-admin-windows'
import { useConvocationAdminDependencies } from '@presentation/di/hooks/use-convocation-admin-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { toDateInputValue } from '@presentation/shared/formatters/date-input'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useNow } from '@presentation/shared/hooks/use-now'
import { queryKeys } from '@presentation/shared/query-keys'
import { teamsForFilters } from '../convocation-filters'
import {
  EMPTY_CONVOCATION_FORM_VALUES,
  buildCreateInput,
  buildUpdateInput,
  resetTypeSpecificValues,
  validateConvocationForm,
  valuesEqual,
  valuesFromItem,
  type ConvocationFormErrors,
  type ConvocationFormField,
  type ConvocationFormValues,
} from './convocation-form'

export type ConvocationFormMode = { mode: 'create' } | { mode: 'edit'; convocationId: string }

const LIST_PATH = '/admin/convocations'
const CREATE_ERROR_MESSAGE = 'La convocation n’a pas pu être créée. Réessayez.'
const UPDATE_ERROR_MESSAGE = 'La convocation n’a pas pu être modifiée. Réessayez.'

// specs/web-create-convocation.md UI design "Écran 2/3" — one ViewModel for the
// create AND edit forms (mode carried by the route). The edit form is the
// create form pre-filled, without Section/Team/Type, and only ever sends the
// fields of the convocation's own type (UpdateConvocationUseCase).
//
// Values = stored/empty base + the user's `edits` overlay, so the pre-fill
// needs no effect and "dirty" is a plain comparison.
export function useConvocationFormViewModel(target: ConvocationFormMode) {
  const isEdit = target.mode === 'edit'
  const convocationId = target.mode === 'edit' ? target.convocationId : ''

  const {
    adminConvocationRepository,
    seasonRepository,
    sectionRepository,
    teamRepository,
    opponentRepository,
    listAvailableTrainingLocationsUseCase,
    createConvocationUseCase,
    updateConvocationUseCase,
  } = useConvocationAdminDependencies()
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const now = useNow()

  const [edits, setEdits] = useState<Partial<ConvocationFormValues>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [serverFieldErrors, setServerFieldErrors] = useState<ConvocationFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [windowClosed, setWindowClosed] = useState(false)
  const [agendaDraft, setAgendaDraft] = useState('')

  // --- Stored convocation (edit) ---
  const itemQuery = useQuery({
    queryKey: queryKeys.adminConvocation(convocationId),
    queryFn: () => adminConvocationRepository.findById(convocationId),
    enabled: isEdit,
  })
  const item = itemQuery.data ?? null

  const baseValues = isEdit ? (item ? valuesFromItem(item) : EMPTY_CONVOCATION_FORM_VALUES) : EMPTY_CONVOCATION_FORM_VALUES
  const values: ConvocationFormValues = { ...baseValues, ...edits }

  // --- Reference data ---
  const currentSeasonQuery = useQuery({
    queryKey: queryKeys.seasonCurrent(),
    queryFn: () => seasonRepository.findCurrent(),
  })
  const sectionsQuery = useQuery({
    queryKey: queryKeys.sectionsAdminList(),
    queryFn: () => sectionRepository.findAll(),
    enabled: !isEdit,
  })
  const teamsQuery = useQuery({
    queryKey: queryKeys.teamsAdminList(),
    queryFn: () => teamRepository.findAllForAdmin(),
    enabled: !isEdit,
  })

  const effectiveTeamId = values.teamId
  const opponentsQuery = useQuery({
    queryKey: queryKeys.teamOpponents(effectiveTeamId),
    queryFn: () => opponentRepository.findByTeamId(effectiveTeamId),
    enabled: values.type === 'match' && !!effectiveTeamId,
  })
  const locationsQuery = useQuery({
    queryKey: queryKeys.trainingLocationsAvailable(),
    queryFn: () => listAvailableTrainingLocationsUseCase.execute(),
    enabled: values.type === 'training',
  })

  // PO-WC-10 — teams offered at creation: current season only.
  const teamOptions = teamsForFilters(teamsQuery.data ?? [], currentSeasonQuery.data?.id ?? null, values.sectionId || null)
  const opponents = opponentsQuery.data ?? []
  const trainingLocations = locationsQuery.data ?? []

  // Edit, training: the stored venue may have been archived since. It stays
  // the selected value (so an unchanged save keeps working) and is shown as a
  // disabled option plus a help line; a CHANGE must pick a non-archived one.
  const storedLocation = item?.convocation.trainingLocation ?? null

  // --- Validation ---
  const clientErrors = showErrors ? validateConvocationForm(values, isEdit ? 'edit' : 'create', now) : {}
  const errors: ConvocationFormErrors = {
    ...clientErrors,
    ...serverFieldErrors,
  }

  const isDirty = isEdit ? !valuesEqual(values, baseValues) : true

  // --- Mutation ---
  const mutation = useMutation({
    mutationFn: async () => {
      if (!user) throw new Error('No authenticated user')
      if (isEdit) {
        return updateConvocationUseCase.execute(
          buildUpdateInput(values, {
            actorId: user.id,
            convocationId,
            now: new Date(),
          }),
        )
      }
      return createConvocationUseCase.execute(buildCreateInput(values, user.id))
    },
    onSuccess: async () => {
      // AC-WC-16 — the list (and the panel) refresh by key invalidation; the
      // mobile screens' shared prefix too, so they don't serve a stale copy.
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
      if (error instanceof ConvocationNotEditableError) {
        // AC-WC-23 — the window closed while the form was open: keep what was
        // typed on screen, offer only the way back, resync in the background.
        setWindowClosed(true)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.adminConvocationsRoot(),
        })
        return
      }
      if (error instanceof TrainingLocationArchivedError) {
        setServerFieldErrors({
          trainingLocationId: mapDomainErrorToUiError(error).message,
        })
        return
      }
      setSubmitError(isEdit ? UPDATE_ERROR_MESSAGE : CREATE_ERROR_MESSAGE)
    },
  })

  function setField<K extends keyof ConvocationFormValues>(field: K, value: ConvocationFormValues[K]) {
    setEdits((current) => {
      const next: Partial<ConvocationFormValues> = {
        ...current,
        [field]: value,
      }
      // Dependent fields: changing the section empties the team; changing the
      // team empties the opponent.
      if (field === 'sectionId') {
        next.teamId = ''
        next.opponentId = ''
      }
      if (field === 'teamId') next.opponentId = ''
      return next
    })
    setServerFieldErrors((current) => {
      const rest = { ...current }
      delete rest[field as ConvocationFormField]
      return rest
    })
    setSubmitError(null)
  }

  function setType(type: ConvocationType) {
    setEdits((current) => resetTypeSpecificValues({ ...baseValues, ...current }, type))
    setServerFieldErrors({})
    setAgendaDraft('')
  }

  function addAgendaPoint() {
    const point = agendaDraft.trim()
    if (!point) return
    setField('agenda', [...values.agenda, point])
    setAgendaDraft('')
  }

  function removeAgendaPoint(index: number) {
    setField(
      'agenda',
      values.agenda.filter((_, pointIndex) => pointIndex !== index),
    )
  }

  function submit() {
    setShowErrors(true)
    setSubmitError(null)
    if (Object.keys(validateConvocationForm(values, isEdit ? 'edit' : 'create', now)).length > 0) return
    mutation.mutate()
  }

  // Edit: reachable only for an upcoming, open convocation. By URL on any
  // other one, the page shows its own "plus modifiable" state (never a form).
  const notFound = isEdit && !itemQuery.isLoading && !itemQuery.error && item === null
  const notEditable = isEdit && item !== null && !isConvocationEditable(item.convocation, now) && !windowClosed

  return {
    isEdit,
    values,
    errors,
    setField,
    setType,

    // States
    isLoading: isEdit && itemQuery.isLoading,
    loadError: isEdit && itemQuery.error ? mapDomainErrorToUiError(itemQuery.error) : null,
    retryLoad: () => {
      void itemQuery.refetch()
    },
    notFound,
    notEditable,
    windowClosed,
    isSubmitting: mutation.isPending,
    submitError,
    // AC-WC-23 — once the window closed there is nothing to retry; for edit,
    // saving is also disabled while nothing changed (form state, not a right).
    canSubmit: !windowClosed && isDirty,

    // Header (edit): plain-text reminder of what can't be changed.
    editSubtitle: item ? `${item.teamName} · ${formatConvocationType(item.convocation.type)}` : '',

    // Options
    sections: sectionsQuery.data ?? [],
    teamOptions,
    opponents,
    isOpponentsLoading: opponentsQuery.isLoading,
    hasNoOpponents: !!effectiveTeamId && !opponentsQuery.isLoading && opponents.length === 0,
    trainingLocations,
    hasNoTrainingLocations: !locationsQuery.isLoading && trainingLocations.length === 0,
    archivedCurrentLocation: storedLocation?.isArchived ? storedLocation : null,
    minDate: toDateInputValue(now),

    // Agenda editor
    agendaDraft,
    setAgendaDraft,
    addAgendaPoint,
    removeAgendaPoint,

    submit,
    cancel: () => navigate(LIST_PATH),
  }
}

export type ConvocationFormViewModel = ReturnType<typeof useConvocationFormViewModel>
