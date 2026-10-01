import type { AdminConvocationListItem } from '@domain/entities/admin-convocation'
import type { ConvocationType } from '@domain/entities/convocation'
import { isValidMatchSchedule } from '@domain/policies/match-scheduling-rules'
import type { CreateConvocationUseCaseInput } from '@domain/usecases/convocation/CreateConvocationUseCase'
import type { UpdateConvocationUseCaseInput } from '@domain/usecases/convocation/UpdateConvocationUseCase'
import { combineDateAndTime, toDateInputValue, toTimeInputValue } from '@presentation/shared/formatters/date-input'

// specs/web-create-convocation.md UI design "Écran 2/3" — the pure part of the
// create/edit form's ViewModel: values, prefill, validation, and the mapping
// to use case inputs. No React here, so it is unit-tested directly. The use
// cases stay the real authority (past date, RDV ordering, opponent
// membership); this validation only gives immediate, field-level feedback.

export interface ConvocationFormValues {
  // Create only: Section then Team pick the team; both absent when editing.
  sectionId: string
  teamId: string
  type: ConvocationType
  date: string // yyyy-mm-dd
  time: string // HH:MM
  trainingLocationId: string
  opponentId: string
  isHome: boolean
  location: string
  meetingPointTime: string // HH:MM, optional, same day as `date`
  meetingPointLocation: string
  title: string
  agenda: string[]
}

export type ConvocationFormField =
  'sectionId' | 'teamId' | 'date' | 'time' | 'trainingLocationId' | 'opponentId' | 'location' | 'meetingPointTime' | 'title'

export type ConvocationFormErrors = Partial<Record<ConvocationFormField, string>>

export const REQUIRED_FIELD_MESSAGE = 'Ce champ est obligatoire.'
export const PAST_DATE_MESSAGE = 'La date et l’heure doivent être dans le futur.'
export const MEETING_POINT_MESSAGE = 'Le rendez-vous doit précéder le coup d’envoi, le même jour.'

export const EMPTY_CONVOCATION_FORM_VALUES: ConvocationFormValues = {
  sectionId: '',
  teamId: '',
  type: 'training', // "Entraînement" by default (export 2)
  date: '',
  time: '',
  trainingLocationId: '',
  opponentId: '',
  isHome: true, // "Domicile" by default (export 3)
  location: '',
  meetingPointTime: '',
  meetingPointLocation: '',
  title: '',
  agenda: [],
}

// Changing the type keeps team, date and time, and resets every field that
// belongs to a type (opponent, location, title, agenda, RDV).
export function resetTypeSpecificValues(values: ConvocationFormValues, type: ConvocationType): ConvocationFormValues {
  return {
    ...values,
    type,
    trainingLocationId: EMPTY_CONVOCATION_FORM_VALUES.trainingLocationId,
    opponentId: EMPTY_CONVOCATION_FORM_VALUES.opponentId,
    isHome: EMPTY_CONVOCATION_FORM_VALUES.isHome,
    location: EMPTY_CONVOCATION_FORM_VALUES.location,
    meetingPointTime: EMPTY_CONVOCATION_FORM_VALUES.meetingPointTime,
    meetingPointLocation: EMPTY_CONVOCATION_FORM_VALUES.meetingPointLocation,
    title: EMPTY_CONVOCATION_FORM_VALUES.title,
    agenda: EMPTY_CONVOCATION_FORM_VALUES.agenda,
  }
}

// Edit mode: the form is pre-filled from the stored convocation.
export function valuesFromItem(item: AdminConvocationListItem): ConvocationFormValues {
  const { convocation } = item
  const kickoff = new Date(convocation.date)
  return {
    ...EMPTY_CONVOCATION_FORM_VALUES,
    teamId: convocation.teamId,
    type: convocation.type,
    date: toDateInputValue(kickoff),
    time: toTimeInputValue(kickoff),
    trainingLocationId: convocation.trainingLocation?.id ?? '',
    location: convocation.location ?? '',
    opponentId: item.match?.opponentId ?? '',
    isHome: item.match?.isHome ?? true,
    meetingPointTime: item.match?.meetingPointTime ? toTimeInputValue(new Date(item.match.meetingPointTime)) : '',
    meetingPointLocation: item.match?.meetingPointLocation ?? '',
    title: item.meeting?.title ?? '',
    agenda: item.meeting?.agenda ?? [],
  }
}

export function valuesEqual(a: ConvocationFormValues, b: ConvocationFormValues): boolean {
  return (
    a.sectionId === b.sectionId &&
    a.teamId === b.teamId &&
    a.type === b.type &&
    a.date === b.date &&
    a.time === b.time &&
    a.trainingLocationId === b.trainingLocationId &&
    a.opponentId === b.opponentId &&
    a.isHome === b.isHome &&
    a.location === b.location &&
    a.meetingPointTime === b.meetingPointTime &&
    a.meetingPointLocation === b.meetingPointLocation &&
    a.title === b.title &&
    a.agenda.length === b.agenda.length &&
    a.agenda.every((point, index) => point === b.agenda[index])
  )
}

function kickoffIso(values: ConvocationFormValues): string | null {
  if (!values.date || !values.time) return null
  return combineDateAndTime(values.date, values.time)
}

export function validateConvocationForm(values: ConvocationFormValues, mode: 'create' | 'edit', now: Date): ConvocationFormErrors {
  const errors: ConvocationFormErrors = {}

  if (mode === 'create') {
    if (!values.sectionId) errors.sectionId = REQUIRED_FIELD_MESSAGE
    if (!values.teamId) errors.teamId = REQUIRED_FIELD_MESSAGE
  }

  if (!values.date) errors.date = REQUIRED_FIELD_MESSAGE
  if (!values.time) errors.time = REQUIRED_FIELD_MESSAGE

  const kickoff = kickoffIso(values)
  if (kickoff && new Date(kickoff) <= now) errors.date = PAST_DATE_MESSAGE

  switch (values.type) {
    case 'training':
      if (!values.trainingLocationId) errors.trainingLocationId = REQUIRED_FIELD_MESSAGE
      break
    case 'match':
      if (!values.opponentId) errors.opponentId = REQUIRED_FIELD_MESSAGE
      if (!values.location.trim()) errors.location = REQUIRED_FIELD_MESSAGE
      // The RDV is optional; when set it must precede the kickoff, same day.
      if (values.meetingPointTime && kickoff && values.date) {
        const rdv = new Date(combineDateAndTime(values.date, values.meetingPointTime))
        if (!isValidMatchSchedule(rdv, new Date(kickoff))) errors.meetingPointTime = MEETING_POINT_MESSAGE
      }
      break
    case 'meeting':
      if (!values.title.trim()) errors.title = REQUIRED_FIELD_MESSAGE
      if (!values.location.trim()) errors.location = REQUIRED_FIELD_MESSAGE
      break
    default: {
      const _exhaustive: never = values.type
      throw new Error(`Unhandled convocation type: ${_exhaustive}`)
    }
  }

  return errors
}

function meetingPointIso(values: ConvocationFormValues): string | null {
  return values.meetingPointTime && values.date ? combineDateAndTime(values.date, values.meetingPointTime) : null
}

// Only the fields of the chosen type are persisted (AC-WC-15).
export function buildCreateInput(values: ConvocationFormValues, actorId: string): CreateConvocationUseCaseInput {
  const base = {
    teamId: values.teamId,
    createdBy: actorId,
    date: combineDateAndTime(values.date, values.time),
  }
  switch (values.type) {
    case 'training':
      return {
        ...base,
        type: 'training',
        trainingLocationId: values.trainingLocationId,
      }
    case 'match':
      return {
        ...base,
        type: 'match',
        location: values.location.trim(),
        opponentId: values.opponentId,
        isHome: values.isHome,
        meetingPointTime: meetingPointIso(values),
        meetingPointLocation: values.meetingPointLocation.trim() || null,
      }
    case 'meeting':
      return {
        ...base,
        type: 'meeting',
        location: values.location.trim(),
        title: values.title.trim(),
        agenda: values.agenda,
      }
    default: {
      const _exhaustive: never = values.type
      throw new Error(`Unhandled convocation type: ${_exhaustive}`)
    }
  }
}

// `teamId` is deliberately absent: an edit can't name another team.
export function buildUpdateInput(
  values: ConvocationFormValues,
  context: { actorId: string; convocationId: string; now: Date },
): UpdateConvocationUseCaseInput {
  const base = {
    ...context,
    date: combineDateAndTime(values.date, values.time),
  }
  switch (values.type) {
    case 'training':
      return {
        ...base,
        type: 'training',
        trainingLocationId: values.trainingLocationId,
      }
    case 'match':
      return {
        ...base,
        type: 'match',
        location: values.location.trim(),
        opponentId: values.opponentId,
        isHome: values.isHome,
        meetingPointTime: meetingPointIso(values),
        meetingPointLocation: values.meetingPointLocation.trim() || null,
      }
    case 'meeting':
      return {
        ...base,
        type: 'meeting',
        location: values.location.trim(),
        title: values.title.trim(),
        agenda: values.agenda,
      }
    default: {
      const _exhaustive: never = values.type
      throw new Error(`Unhandled convocation type: ${_exhaustive}`)
    }
  }
}
