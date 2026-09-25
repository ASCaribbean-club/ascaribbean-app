import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import type { ConvocationType } from '@domain/entities/convocation'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { isValidMatchSchedule } from '@domain/policies/match-scheduling-rules'
import { isPastDate } from '@domain/rules/convocation-rules'
import type { CreateConvocationUseCaseInput } from '@domain/usecases/convocation/CreateConvocationUseCase'
import { useConvocationDependencies } from '../../di/hooks/use-convocation-dependencies'
import { combineDateAndTime, toDateInputValue } from '../../shared/formatters/date-input'
import { useAuth } from '../../shared/hooks/use-auth'
import { usePermission } from '../../shared/hooks/use-permission'
import { queryKeys } from '../../shared/query-keys'

// specs/create-convocation.md §1, "Décision — l'équipe cible n'est pas
// choisie sur cet écran" — the target team (and its headcount, "même
// source que le compteur licenciés du tableau de bord") is inherited from
// whichever screen pushed this route, passed as router state rather than
// re-derived here. Today the only caller is CoachDashboardPage's FAB (see
// useCoachDashboardViewModel.openConvocationCreate); a future Calendrier
// entry point (§7, not built yet) would push the same shape.
interface CreateConvocationRouteState {
  teamId: string
  activeMemberCount?: number
}

export interface ConvocationFormValues {
  type: ConvocationType
  date: string
  time: string
  location: string

  // match only (see domain/entities/match-details.ts)
  opponentId: string
  isHome: boolean
  meetingPointTime: string
  meetingPointLocation: string

  // meeting only (see domain/entities/meeting-details.ts)
  title: string
  agenda: string[]
}

const EMPTY_VALUES: ConvocationFormValues = {
  // UI design §2, "Questions ouvertes UI" point 1: spec doesn't confirm
  // Match-by-default vs. no-forced-selection, only notes all 4 mockups show
  // Match. Picking Match deterministically here since the point is marked
  // non-blocking — revisit if that turns out to be the wrong call in usage.
  type: 'match',
  date: '',
  time: '',
  location: '',
  opponentId: '',
  isHome: true,
  meetingPointTime: '',
  meetingPointLocation: '',
  title: '',
  agenda: [],
}

// specs/create-convocation.md §2, "champ par type" table — the required
// subset per `type`, mirrored here for the submit button's disabled state
// (UI design §"Structure de l'écran", point 5). `isHome` isn't listed: it's
// a boolean toggle that always carries a value (defaults `true`), never an
// empty-string case like the fields below. Coach feedback (2026-09-25):
// `meetingPointTime`/`meetingPointLocation` (RDV) are deliberately NOT part
// of this check anymore — a coach may create a match without knowing the RDV
// yet (see CreateConvocationUseCase's matching relaxation).
function isFormComplete(values: ConvocationFormValues): boolean {
  if (!values.date || !values.time) return false

  switch (values.type) {
    case 'match':
      return !!values.opponentId && !!values.location
    case 'training':
      return !!values.location
    case 'meeting':
      // Agenda is explicitly optional (§2, "Ordre du jour... liste vide
      // acceptée à la soumission") — not part of this check.
      return !!values.title && !!values.location
    default: {
      const _exhaustive: never = values.type
      throw new Error(`Unhandled convocation type: ${_exhaustive}`)
    }
  }
}

// specs/create-convocation.md §5 — message for the one business rule the use
// case (the real authority) can still reject a submission for after the
// client-side pre-checks in `onSubmit` (a race, e.g. clock skew, rather than
// the common case). Deliberately not showing `error.message` verbatim for
// other `DomainError` subclasses (e.g. `ForbiddenError`, whose message is
// English and embeds a raw user id) — this screen only has user-facing
// copy for the two rules it actually pre-checks; anything else falls back
// to a generic message rather than leaking internal error text.
function toFieldErrorMessage(error: unknown): string {
  if (error instanceof InvalidScheduleError) {
    return 'Le rendez-vous doit précéder le coup d’envoi, le même jour.'
  }
  return 'Impossible de créer la convocation. Réessayez.'
}

export function useCreateConvocationViewModel(initialValues?: Partial<ConvocationFormValues>) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { createConvocationUseCase, opponentRepository } = useConvocationDependencies()

  const routeState = location.state as CreateConvocationRouteState | null
  const teamId = routeState?.teamId

  const canCreateConvocation = usePermission('convocation:create', { teamId })

  const { data: opponents = [] } = useQuery({
    queryKey: queryKeys.teamOpponents(teamId),
    queryFn: () => (teamId ? opponentRepository.findByTeamId(teamId) : Promise.resolve([])),
    enabled: !!teamId,
  })

  // Controlled-form state — mechanical wiring (ARCHITECTURE.md §6 still
  // applies to what happens WITH these values, see the TODOs below).
  const [values, setValues] = useState<ConvocationFormValues>({ ...EMPTY_VALUES, ...initialValues })

  // Local, immediate-feedback error — set by the client-side pre-checks in
  // `onSubmit` below (isPastDate / isValidMatchSchedule, same mirror rules
  // the use case enforces as the real authority). Cleared on every field
  // edit (see `setField` below), not just on a fresh submit, so a red
  // message doesn't linger after the user has already changed something.
  const [scheduleError, setScheduleError] = useState<string>()

  function setField<K extends keyof ConvocationFormValues>(key: K, value: ConvocationFormValues[K]) {
    setValues((current) => ({ ...current, [key]: value }))
    setScheduleError(undefined)
  }

  const createConvocation = useMutation({
    mutationFn: (input: CreateConvocationUseCaseInput) => createConvocationUseCase.execute(input),
    onSuccess: () => {
      if (teamId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.teamUpcomingConvocations(teamId) })
      }
      // Reset before navigating away, not after: `navigate(-1)` only pops
      // the history entry, it doesn't guarantee this component unmounts —
      // a gesture-based back/forward can return here with the same
      // component instance still alive, and without this it would show the
      // just-submitted convocation's values instead of a blank form.
      setValues(EMPTY_VALUES)
      navigate(-1)
    },
  })

  const canSubmit = isFormComplete(values) && !createConvocation.isPending

  const fieldError = scheduleError ?? (createConvocation.error ? toFieldErrorMessage(createConvocation.error) : undefined)

  function onSubmit() {
    if (!teamId || !user) return

    const isoDate = combineDateAndTime(values.date, values.time)

    // Mirror of the domain rule (domain/rules/convocation-rules.ts,
    // specs/create-convocation.md §5, "Date passée interdite") — the
    // Postgres trigger is the actual authority, this is only a fast,
    // readable rejection without a round-trip.
    if (isPastDate(isoDate, new Date())) {
      setScheduleError('La date et l’heure sélectionnées sont déjà passées.')
      return
    }

    let input: CreateConvocationUseCaseInput
    switch (values.type) {
      case 'match': {
        // RDV is optional (coach feedback, 2026-09-25) — only combined/
        // validated when the coach actually filled it in.
        const meetingPointTime = values.meetingPointTime ? combineDateAndTime(values.date, values.meetingPointTime) : null
        // Mirror of domain/policies/match-scheduling-rules.ts (§5,
        // résolution PO-CV-09) — same reasoning as the past-date check above.
        if (meetingPointTime && !isValidMatchSchedule(new Date(meetingPointTime), new Date(isoDate))) {
          setScheduleError('Le rendez-vous doit précéder le coup d’envoi, le même jour.')
          return
        }
        input = {
          type: 'match',
          teamId,
          createdBy: user.id,
          date: isoDate,
          location: values.location,
          opponentId: values.opponentId,
          isHome: values.isHome,
          meetingPointTime,
          meetingPointLocation: values.meetingPointLocation || null,
        }
        break
      }
      case 'training':
        input = {
          type: 'training',
          teamId,
          createdBy: user.id,
          date: isoDate,
          location: values.location,
        }
        break
      case 'meeting':
        input = {
          type: 'meeting',
          teamId,
          createdBy: user.id,
          date: isoDate,
          location: values.location,
          title: values.title,
          agenda: values.agenda,
        }
        break
      default: {
        const _exhaustive: never = values.type
        throw new Error(`Unhandled convocation type: ${_exhaustive}`)
      }
    }

    setScheduleError(undefined)
    createConvocation.mutate(input)
  }

  function goBack() {
    // UI design §2, "Questions ouvertes UI" point 2: no confirmation on a
    // partially-filled form on the way out — explicitly not designed,
    // deliberately not added here either.
    navigate(-1)
  }

  return {
    // Not really "loading" (no query runs in this pass) — `hasTeam` is the
    // one that matters: `teamId` only exists because CoachDashboardPage
    // passed it via `navigate(path, { state })` (see
    // useCoachDashboardViewModel.openConvocationCreate). A hard refresh on
    // this route loses `location.state` entirely, so `teamId` becomes
    // undefined even for a coach who legitimately opened this screen a
    // moment ago.
    // TODO: decide whether that's acceptable (this screen is only ever
    // reached by an in-app tap, never a bookmark/shared link — a refresh
    // bouncing back is arguably fine) or whether teamId needs to survive a
    // refresh (e.g. a route param + a fresh lookup) — not decided by the
    // spec, don't guess silently either way.
    hasTeam: !!teamId,
    canCreateConvocation,

    values,
    // Native `min` bound for the Date field's DateTimeInput — see
    // toDateInputValue's comment for why this isn't `isPastDate` itself
    // (that's the real domain rule, enforced on submit, not here).
    minDate: toDateInputValue(new Date()),
    setType: (type: ConvocationType) => setField('type', type),
    setDate: (date: string) => setField('date', date),
    setTime: (time: string) => setField('time', time),
    setLocation: (value: string) => setField('location', value),
    setOpponentId: (value: string) => setField('opponentId', value),
    setIsHome: (value: boolean) => setField('isHome', value),
    setMeetingPointTime: (value: string) => setField('meetingPointTime', value),
    setMeetingPointLocation: (value: string) => setField('meetingPointLocation', value),
    setTitle: (value: string) => setField('title', value),
    setAgenda: (agenda: string[]) => setField('agenda', agenda),

    opponents,

    recipientsCount: routeState?.activeMemberCount,

    canSubmit,
    fieldError,
    onSubmit,
    goBack,
  }
}