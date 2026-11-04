import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate, useSearchParams } from 'react-router-dom'
import type { ConvocationType } from '@domain/entities/convocation'
import { ConvocationCreationWindowClosedError } from '@domain/errors/convocation-creation-window-closed-error'
import { ConvocationAttendeeCapExceededError } from '@domain/errors/convocation-attendee-cap-exceeded-error'
import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { TrainingDuplicationIncompleteError } from '@domain/errors/training-duplication-incomplete-error'
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
  computeRepeatDates,
  getRepeatMaxDate,
  getFormCreationWindow,
  resetTypeSpecificValues,
  validateConvocationForm,
  valuesEqual,
  valuesForDuplicate,
  valuesFromItem,
  type ConvocationFormErrors,
  type ConvocationFormField,
  type ConvocationFormValues,
} from './convocation-form'

export type ConvocationFormMode = { mode: 'create' } | { mode: 'edit'; convocationId: string }

const LIST_PATH = '/admin/convocations'
const CREATE_ERROR_MESSAGE = 'La convocation n’a pas pu être créée. Réessayez.'
const OFFICIAL_CAP_MESSAGE =
  'Un match officiel est limité à 14 convoqués : cette équipe compte plus de joueurs. Choisissez Amical, ou créez la convocation depuis l’application mobile pour sélectionner les joueurs.'
const EMPTY_TEAM_MESSAGE = 'Cette équipe n’a aucun joueur à convoquer.'
const UPDATE_ERROR_MESSAGE = 'La convocation n’a pas pu être modifiée. Réessayez.'

// "lundi 11 novembre 2026 · 18:30" — one line of the recap.
function formatRecapDate(date: Date): string {
  const day = date.toLocaleDateString('fr-FR', { weekday: 'long', day: 'numeric', month: 'long', year: 'numeric' })
  const time = date.toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })
  return `${day} · ${time}`
}

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
    createRecurringTrainingsUseCase,
    updateConvocationUseCase,
    listTeamPlayersUseCase,
  } = useConvocationAdminDependencies()
  const { user } = useAuth()
  const navigate = useNavigate()
  // `?from=<trainingId>` ("Dupliquer"): the creation form pre-filled from it.
  const [searchParams] = useSearchParams()
  const duplicateFromId = isEdit ? null : searchParams.get('from')
  const queryClient = useQueryClient()
  const now = useNow()

  const [edits, setEdits] = useState<Partial<ConvocationFormValues>>({})
  const [showErrors, setShowErrors] = useState(false)
  const [serverFieldErrors, setServerFieldErrors] = useState<ConvocationFormErrors>({})
  const [submitError, setSubmitError] = useState<string | null>(null)
  const [windowClosed, setWindowClosed] = useState(false)
  const [agendaDraft, setAgendaDraft] = useState('')
  const [isRecapOpen, setIsRecapOpen] = useState(false)
  // After a partial run, resubmitting would duplicate what was created.
  const [isIncomplete, setIsIncomplete] = useState(false)

  // --- Stored convocation (edit, or the training being duplicated) ---
  const sourceId = isEdit ? convocationId : (duplicateFromId ?? '')
  const hasSource = isEdit || !!duplicateFromId
  const itemQuery = useQuery({
    queryKey: queryKeys.adminConvocation(sourceId),
    queryFn: () => adminConvocationRepository.findById(sourceId),
    enabled: hasSource,
  })
  const item = itemQuery.data ?? null
  // Only a training can be duplicated: any other `from` is ignored (empty form).
  const duplicateSource = !isEdit && item?.convocation.type === 'training' ? item : null

  const baseValues = isEdit
    ? item
      ? valuesFromItem(item)
      : EMPTY_CONVOCATION_FORM_VALUES
    : duplicateSource
      ? valuesForDuplicate(duplicateSource)
      : EMPTY_CONVOCATION_FORM_VALUES
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

  // Create only — the ViewModel exposes booleans, the component computes no
  // dates. `response_closed` blocks the submit; `retroactive` only shows a
  // hint (the use case and RLS decide the permission).
  const creationWindow = isEdit ? null : getFormCreationWindow(values, now)
  const isResponseWindowClosed = creationWindow === 'response_closed'
  const isRetroactive = creationWindow === 'retroactive'

  const isDirty = isEdit ? !valuesEqual(values, baseValues) : true

  // Training creation with "Répéter": the full list of trainings to create,
  // first included — shown in the recap before anything is written.
  const isRepeatAvailable = !isEdit && values.type === 'training'
  const isRepeating = isRepeatAvailable && values.repeat
  const repeatDates = computeRepeatDates(values)
  const repeatMaxDate = getRepeatMaxDate(values)

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
      // specs/convocation-player-selection.md PO-CPS-08 — no selection list on
      // the web in this pass: the whole team is convoked. The roster is read
      // at submit time so the list is the team's players as of now.
      const players = await listTeamPlayersUseCase.execute(values.teamId)
      const input = buildCreateInput(
        values,
        user.id,
        players.map((player) => player.userId),
      )
      if (isRepeating && input.type === 'training') {
        return createRecurringTrainingsUseCase.execute({
          training: input,
          frequency: values.repeatFrequency,
          until: new Date(`${values.repeatUntil}T00:00`),
        })
      }
      return createConvocationUseCase.execute(input)
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
    onError: async (error) => {
      if (error instanceof TrainingDuplicationIncompleteError) {
        setIsIncomplete(true)
        setSubmitError(
          `${error.createdCount} entraînement(s) sur ${error.requestedCount} ont été créés, puis l’opération s’est arrêtée au ${formatRecapDate(new Date(error.firstFailedDate))}. Vérifiez la liste avant de recommencer, pour ne pas créer de doublons.`,
        )
        await Promise.all([
          queryClient.invalidateQueries({ queryKey: queryKeys.adminConvocationsRoot() }),
          queryClient.invalidateQueries({ queryKey: queryKeys.convocationsRoot() }),
        ])
        return
      }
      if (error instanceof ConvocationNotEditableError) {
        // AC-WC-23 — the window closed while the form was open: keep what was
        // typed on screen, offer only the way back, resync in the background.
        setWindowClosed(true)
        void queryClient.invalidateQueries({
          queryKey: queryKeys.adminConvocationsRoot(),
        })
        return
      }
      if (error instanceof ConvocationCreationWindowClosedError) {
        // The slot moved into the closed response window while the form was
        // open (use case is the authority): same copy as the inline message.
        setSubmitError(mapDomainErrorToUiError(error).message)
        return
      }
      if (error instanceof TrainingLocationArchivedError) {
        setServerFieldErrors({
          trainingLocationId: mapDomainErrorToUiError(error).message,
        })
        return
      }
      // PO-CPS-08 — an official match above the cap is refused readably, the
      // team is never truncated; an empty team cannot be convoked.
      if (error instanceof ConvocationAttendeeCapExceededError) {
        setSubmitError(OFFICIAL_CAP_MESSAGE)
        return
      }
      if (error instanceof InvalidConvocationInputError && !isEdit) {
        setSubmitError(EMPTY_TEAM_MESSAGE)
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
    // Several trainings at once: the admin reviews the list first.
    if (isRepeating) {
      setIsRecapOpen(true)
      return
    }
    mutation.mutate()
  }

  function confirmRecap() {
    setIsRecapOpen(false)
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
    isLoading: hasSource && itemQuery.isLoading,
    loadError: hasSource && itemQuery.error ? mapDomainErrorToUiError(itemQuery.error) : null,
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
    canSubmit: !windowClosed && isDirty && !isResponseWindowClosed && !isIncomplete,
    isIncomplete,
    isResponseWindowClosed,
    isRetroactive,

    // Header (edit): plain-text reminder of what can't be changed.
    // Duplicate: where the pre-filled values come from.
    duplicateSubtitle: duplicateSource
      ? `Copie de ${duplicateSource.teamName} · ${formatRecapDate(new Date(duplicateSource.convocation.date))}`
      : '',
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
    // Create: no lower bound — an admin may enter a forgotten past convocation.
    minDate: isEdit ? toDateInputValue(now) : undefined,

    // Agenda editor
    agendaDraft,
    setAgendaDraft,
    addAgendaPoint,
    removeAgendaPoint,

    // "Répéter" (training creation) and its recap before validation.
    isRepeatAvailable,
    isRepeating,
    repeatMinDate: values.date || undefined,
    repeatMaxDate: repeatMaxDate ? toDateInputValue(repeatMaxDate) : undefined,
    repeatCount: repeatDates.length,
    repeatDateLabels: repeatDates.map(formatRecapDate),
    recapTeamName: teamOptions.find((team) => team.id === values.teamId)?.name ?? '',
    recapLocationName: trainingLocations.find((location) => location.id === values.trainingLocationId)?.name ?? '',
    isRecapOpen,
    closeRecap: () => setIsRecapOpen(false),
    confirmRecap,

    submit,
    cancel: () => navigate(LIST_PATH),
  }
}

export type ConvocationFormViewModel = ReturnType<typeof useConvocationFormViewModel>
