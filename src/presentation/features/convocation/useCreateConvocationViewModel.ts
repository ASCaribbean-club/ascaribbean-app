import { useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useLocation, useNavigate } from 'react-router-dom'
import type { CompetitionType } from '@domain/entities/competition-type'
import type { ConvocationType } from '@domain/entities/convocation'
import { ConvocationAttendeeCapExceededError } from '@domain/errors/convocation-attendee-cap-exceeded-error'
import { ConvocationCreationWindowClosedError } from '@domain/errors/convocation-creation-window-closed-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { InvalidScheduleError } from '@domain/errors/invalid-schedule-error'
import { TrainingLocationArchivedError } from '@domain/errors/training-location-archived-error'
import { getAttendeeCap } from '@domain/policies/convocation-attendee-rules'
import { getConvocationCreationWindow } from '@domain/policies/convocation-creation-window'
import { isValidMatchSchedule } from '@domain/policies/match-scheduling-rules'
import { filterTeamsBySection } from '@domain/rules/club-schedule-rules'
import { isPastDate } from '@domain/rules/convocation-rules'
import type { CreateConvocationUseCaseInput } from '@domain/usecases/convocation/CreateConvocationUseCase'
import { mapDomainErrorToUiError } from '../../shared/errors/map-domain-error-to-ui-error'
import { useClubOverviewDependencies } from '../../di/hooks/use-club-overview-dependencies'
import { useConvocationDependencies } from '../../di/hooks/use-convocation-dependencies'
import { combineDateAndTime, toDateInputValue } from '../../shared/formatters/date-input'
import { useActiveRole } from '../../shared/hooks/use-active-role'
import { useAuth } from '../../shared/hooks/use-auth'
import { useSectionFilter } from '../../shared/hooks/use-section-filter'
import { usePermission } from '../../shared/hooks/use-permission'
import { queryKeys } from '../../shared/query-keys'
import {
  describeCounter,
  EMPTY_TEAM_MESSAGE,
  getSelectionBlockingMessage,
  isAllTeamLocked,
  resolveSelectedIds,
  toggleSelection,
  type RecipientsViewModel,
} from './recipients-selection'

// specs/create-convocation.md §1, "Décision — l'équipe cible n'est pas
// choisie sur cet écran" — the target team is inherited from whichever
// screen pushed this route, passed as router state rather than re-derived
// here. (The headcount that used to travel with it, `activeMemberCount`, is no
// longer read: the DESTINATAIRES card now lists the team's real players,
// specs/convocation-player-selection.md.) Today the only caller is CoachDashboardPage's FAB (see
// useCoachDashboardViewModel.openConvocationCreate); a future Calendrier
// entry point (§7, not built yet) would push the same shape.
interface CreateConvocationRouteState {
  teamId: string
}

export interface ConvocationFormValues {
  type: ConvocationType
  date: string
  time: string
  // match / meeting only — a training references a venue by id instead
  // (`trainingLocationId` below, specs/web-localizations.md §2.7).
  location: string
  // training only — the selected training_locations id, never free text.
  trainingLocationId: string

  // match only (see domain/entities/match-details.ts)
  opponentId: string
  isHome: boolean
  // specs/convocation-player-selection.md AC-CPS-05/PO-CPS-10 — no
  // preselected value (null = not chosen yet): submission stays impossible
  // until the coach picks Officiel or Amical.
  competitionType: CompetitionType | null
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
  trainingLocationId: '',
  opponentId: '',
  isHome: true,
  competitionType: null,
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
function isFormComplete(values: ConvocationFormValues, selectedTrainingLocationId: string): boolean {
  if (!values.date || !values.time) return false

  switch (values.type) {
    case 'match':
      return !!values.opponentId && !!values.location && values.competitionType !== null
    case 'training':
      // specs/web-localizations.md §2.7/AC-WL-17 — a venue must be selected;
      // with an empty venue list this stays false, so submission is
      // impossible.
      return !!selectedTrainingLocationId
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
  if (error instanceof ConvocationCreationWindowClosedError) {
    return 'Les réponses des joueurs sont closes pour ce créneau : choisissez une heure plus tardive.'
  }
  // specs/convocation-player-selection.md §3, "Échec de la création" — the
  // database refused the selection (cap hit by a concurrent write, a player no
  // longer on the team): readable reason, selection kept.
  if (error instanceof ConvocationAttendeeCapExceededError) {
    return 'Impossible de créer la convocation : un match officiel est limité à 14 convoqués.'
  }
  if (error instanceof InvalidConvocationInputError) {
    return 'Impossible de créer la convocation : la sélection des joueurs n’est pas valide.'
  }
  return 'Impossible de créer la convocation. Réessayez.'
}

export function useCreateConvocationViewModel(initialValues?: Partial<ConvocationFormValues>) {
  const { user } = useAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const queryClient = useQueryClient()
  const { createConvocationUseCase, opponentRepository, listAvailableTrainingLocationsUseCase, listTeamPlayersUseCase } =
    useConvocationDependencies()

  const routeState = location.state as CreateConvocationRouteState | null

  // specs/mobile-dirigeant-habilite.md §1.4/PO-DH-18 — two sources for the
  // target team coexist: the coach inherits it through router state (flow
  // unchanged), the Dirigeant (no current team) picks Section then Équipe on
  // this screen. The picker only exists when no teamId came through the route
  // AND the active role is the Dirigeant (AC-DH-17).
  const { isOfficerView } = useActiveRole()
  const { sectionFilter } = useSectionFilter()
  const { sectionRepository, listClubTeamsUseCase } = useClubOverviewDependencies()
  const needsTeamPicker = !routeState?.teamId && isOfficerView
  // Pre-filled with the dashboard's active filter when it is not "Toutes".
  const [pickedSectionId, setPickedSectionId] = useState<string | null>(sectionFilter)
  const [pickedTeamId, setPickedTeamId] = useState<string | null>(null)
  const teamId = routeState?.teamId ?? (needsTeamPicker ? (pickedTeamId ?? undefined) : undefined)

  const sectionsQuery = useQuery({
    queryKey: queryKeys.clubSections(),
    queryFn: () => sectionRepository.findAll(),
    enabled: needsTeamPicker,
  })
  const clubTeamsQuery = useQuery({
    queryKey: queryKeys.clubTeams(),
    queryFn: () => listClubTeamsUseCase.execute(),
    enabled: needsTeamPicker,
  })
  const sectionTeams = filterTeamsBySection(clubTeamsQuery.data ?? [], pickedSectionId)

  const canCreateConvocation = usePermission('convocation:create', { teamId })

  const { data: opponents = [] } = useQuery({
    queryKey: queryKeys.teamOpponents(teamId),
    queryFn: () => (teamId ? opponentRepository.findByTeamId(teamId) : Promise.resolve([])),
    enabled: !!teamId,
  })

  // Controlled-form state — mechanical wiring (ARCHITECTURE.md §6 still
  // applies to what happens WITH these values, see the TODOs below).
  const [values, setValues] = useState<ConvocationFormValues>({ ...EMPTY_VALUES, ...initialValues })

  // specs/convocation-player-selection.md PO-CPS-10 — `null` = "Toute l'équipe"
  // (every player of the team convoked); an array = the explicit selection of
  // the list. A new team (Dirigeant's picker) always starts back on "Toute
  // l'équipe" for that team.
  const [customSelection, setCustomSelection] = useState<string[] | null>(null)

  // Changing section clears the team; changing team resets the opponent
  // (an opponent belongs to a team, §1.4) and the selection.
  function onPickSection(sectionId: string) {
    setPickedSectionId(sectionId)
    setPickedTeamId(null)
    setCustomSelection(null)
    setValues((current) => ({ ...current, opponentId: '' }))
  }
  function onPickTeam(nextTeamId: string) {
    setPickedTeamId(nextTeamId)
    setCustomSelection(null)
    setValues((current) => ({ ...current, opponentId: '' }))
  }

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

  const isTraining = values.type === 'training'

  // specs/web-localizations.md §2.7/AC-WL-16 — the selector's options: the
  // non-archived venues, loaded only while the Entraînement type is chosen.
  // An empty list is a valid state (AC-WL-17), not an error.
  const trainingLocationsQuery = useQuery({
    queryKey: queryKeys.trainingLocationsAvailable(),
    queryFn: () => listAvailableTrainingLocationsUseCase.execute(),
    enabled: isTraining,
  })
  const trainingLocations = trainingLocationsQuery.data ?? []
  // A selection that is no longer in the (refetched) list — e.g. the venue
  // was archived meanwhile — counts as no selection.
  const selectedTrainingLocationId = trainingLocations.some((option) => option.id === values.trainingLocationId)
    ? values.trainingLocationId
    : ''

  // specs/convocation-player-selection.md §3 — the team's real players, the
  // base of the DESTINATAIRES card (replaces the headcount that used to come
  // through router state).
  const teamPlayersQuery = useQuery({
    queryKey: queryKeys.teamPlayersForConvocation(teamId ?? ''),
    queryFn: () => listTeamPlayersUseCase.execute(teamId!),
    enabled: !!teamId,
  })
  const teamPlayers = teamPlayersQuery.data ?? []
  const allPlayerIds = teamPlayers.map((player) => player.userId)
  const selectedIds = resolveSelectedIds(allPlayerIds, customSelection)

  const competitionType = values.type === 'match' ? values.competitionType : null
  // Official match + team above the cap: "Toute l'équipe" cannot stay active,
  // the list is forced open with everyone pre-ticked (PO-CPS-10).
  const allTeamLocked = isAllTeamLocked(teamPlayers.length, values.type, competitionType)
  const isAllTeamActive = customSelection === null && !allTeamLocked
  const recipientsStatus: RecipientsViewModel['status'] = teamPlayersQuery.isLoading
    ? 'loading'
    : teamPlayersQuery.isError
      ? 'error'
      : teamPlayers.length === 0
        ? 'empty'
        : 'ready'
  const selectionBlockingMessage =
    recipientsStatus === 'ready' ? getSelectionBlockingMessage(selectedIds.length, values.type, competitionType) : null
  const cap = getAttendeeCap(values.type, competitionType)

  const recipients: RecipientsViewModel = {
    status: recipientsStatus,
    players: teamPlayers.map((player) => ({
      userId: player.userId,
      displayName: player.displayName,
      selected: selectedIds.includes(player.userId),
    })),
    isAllTeamActive,
    isAllTeamLocked: allTeamLocked,
    allTeamLockedMessage: allTeamLocked
      ? `Indisponible : l’équipe compte ${teamPlayers.length} joueurs, un match officiel est limité à ${cap}.`
      : null,
    playerCountLabel: `${teamPlayers.length} joueur${teamPlayers.length > 1 ? 's' : ''}`,
    counter: recipientsStatus === 'ready' ? describeCounter(selectedIds.length, values.type, competitionType) : null,
    blockingMessage: selectionBlockingMessage,
    // "Tout sélectionner" is absent (not greyed) when it could only break the cap.
    bulkActionLabel:
      selectedIds.length > 0 ? 'Tout désélectionner' : allTeamLocked ? null : 'Tout sélectionner',
    // Off -> list opens with everyone ticked; on -> back to the whole team
    // (manual selection dropped, no confirmation: cheap to redo).
    onToggleAllTeam: (active) => setCustomSelection(active ? null : allPlayerIds),
    onTogglePlayer: (userId) => setCustomSelection(toggleSelection(selectedIds, userId)),
    onBulkAction: () => setCustomSelection(selectedIds.length > 0 ? [] : allPlayerIds),
    onRetry: () => void teamPlayersQuery.refetch(),
  }

  const createConvocation = useMutation({
    mutationFn: (input: CreateConvocationUseCaseInput) => createConvocationUseCase.execute(input),
    onError: (error) => {
      // §2.7 — a venue archived between opening the form and submitting:
      // the form stays open with everything else kept, the chosen venue is
      // cleared and the list reloaded so the archived one disappears.
      if (error instanceof TrainingLocationArchivedError) {
        setValues((current) => ({ ...current, trainingLocationId: '' }))
        void queryClient.invalidateQueries({ queryKey: queryKeys.trainingLocationsRoot() })
      }
    },
    onSuccess: () => {
      if (teamId) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.teamUpcomingConvocations(teamId) })
      }
      // AC-DH-18: the Dirigeant's dashboard and calendar share this key.
      void queryClient.invalidateQueries({ queryKey: queryKeys.clubSchedule() })
      // Reset before navigating away, not after: `navigate(-1)` only pops
      // the history entry, it doesn't guarantee this component unmounts —
      // a gesture-based back/forward can return here with the same
      // component instance still alive, and without this it would show the
      // just-submitted convocation's values instead of a blank form.
      setValues(EMPTY_VALUES)
      setCustomSelection(null)
      navigate(-1)
    },
  })

  // Boolean for the form: the slot sits inside the type's closed response
  // window (deadline <= now < kickoff), refused for everyone by the use case.
  // A past kickoff stays refused for a coach by the isPastDate check on submit
  // — retroactive creation is an admin-only web action.
  const isResponseWindowClosed =
    !!values.date &&
    !!values.time &&
    getConvocationCreationWindow(values.type, new Date(combineDateAndTime(values.date, values.time)), new Date()) ===
      'response_closed'

  // The team is mandatory: always true for the coach flow (it came through
  // the route), only becomes meaningful for the Dirigeant's picker.
  const canSubmit =
    !!teamId &&
    isFormComplete(values, selectedTrainingLocationId) &&
    recipientsStatus === 'ready' &&
    selectionBlockingMessage === null &&
    !isResponseWindowClosed &&
    !createConvocation.isPending

  // The "venue no longer available" refusal is shown inline under the venue
  // field, not in the bottom message.
  const trainingLocationError =
    createConvocation.error instanceof TrainingLocationArchivedError
      ? mapDomainErrorToUiError(createConvocation.error).message
      : undefined

  const fieldError =
    (needsTeamPicker && !teamId ? 'Choisissez une section puis une équipe.' : undefined) ??
    scheduleError ??
    (values.type === 'match' && values.competitionType === null ? 'Choisissez Officiel ou Amical' : undefined) ??
    (recipientsStatus === 'empty' ? EMPTY_TEAM_MESSAGE : undefined) ??
    selectionBlockingMessage ??
    (isResponseWindowClosed
      ? 'Les réponses des joueurs sont closes pour ce créneau : choisissez une heure plus tardive.'
      : undefined) ??
    (createConvocation.error && !trainingLocationError ? toFieldErrorMessage(createConvocation.error) : undefined)

  function onSubmit() {
    if (!teamId || !user || recipientsStatus !== 'ready') return
    // The ids actually submitted: the selection, restricted to current players.
    const attendeeIds = selectedIds

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
        // Disabled-submit guarantees a chosen competition; kept as a guard for the types.
        if (values.competitionType === null) return
        input = {
          type: 'match',
          competitionType: values.competitionType,
          attendeeIds,
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
          attendeeIds,
          teamId,
          createdBy: user.id,
          date: isoDate,
          trainingLocationId: selectedTrainingLocationId,
        }
        break
      case 'meeting':
        input = {
          type: 'meeting',
          attendeeIds,
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
    hasTeam: !!teamId || needsTeamPicker,
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
    setTrainingLocationId: (value: string) => {
      setField('trainingLocationId', value)
      // Drop the previous refusal once another venue is picked.
      createConvocation.reset()
    },
    setOpponentId: (value: string) => setField('opponentId', value),
    setIsHome: (value: boolean) => setField('isHome', value),
    // true = Officiel, false = Amical — converted to the domain value here,
    // never in the component (specs/convocation-player-selection.md UI design §1).
    isOfficial: values.competitionType === null ? null : values.competitionType === 'official',
    setIsOfficial: (isOfficial: boolean) => setField('competitionType', isOfficial ? 'official' : 'friendly'),
    setMeetingPointTime: (value: string) => setField('meetingPointTime', value),
    setMeetingPointLocation: (value: string) => setField('meetingPointLocation', value),
    setTitle: (value: string) => setField('title', value),
    setAgenda: (agenda: string[]) => setField('agenda', agenda),

    opponents,

    // specs/web-localizations.md §2.7 — selector state, one boolean per
    // distinct rendering (loading / load error / empty / options).
    trainingLocations,
    selectedTrainingLocationId,
    isLoadingTrainingLocations: trainingLocationsQuery.isLoading,
    hasTrainingLocationsError: trainingLocationsQuery.isError,
    hasNoTrainingLocations:
      !trainingLocationsQuery.isLoading && !trainingLocationsQuery.isError && trainingLocations.length === 0,
    trainingLocationError,
    retryLoadTrainingLocations: () => void trainingLocationsQuery.refetch(),

    // specs/convocation-player-selection.md §3 — the card is interactive for the
    // three types and, once a team is known, also for the Dirigeant (the form
    // is shared). It supersedes the PO-DH-17 omission of the card.
    recipients,
    hasRecipientsCard: !!teamId,
    hasSelectedTeam: !!teamId,
    // specs/mobile-dirigeant-habilite.md §1.4 — null for the coach (flow
    // unchanged: no picker).
    teamPicker: needsTeamPicker
      ? {
          sections: sectionsQuery.data ?? [],
          selectedSectionId: pickedSectionId,
          selectedTeamId: pickedTeamId,
          teams: sectionTeams,
          isLoadingTeams: clubTeamsQuery.isLoading,
          hasTeamsError: clubTeamsQuery.isError,
          hasNoTeamInSection: !!pickedSectionId && !clubTeamsQuery.isLoading && !clubTeamsQuery.isError && sectionTeams.length === 0,
          retryLoadTeams: () => void clubTeamsQuery.refetch(),
          onPickSection,
          onPickTeam,
        }
      : null,

    canSubmit,
    fieldError,
    onSubmit,
    goBack,
  }
}