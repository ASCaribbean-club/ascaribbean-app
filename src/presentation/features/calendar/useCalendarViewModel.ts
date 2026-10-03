import { useEffect, useState } from 'react'
import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { Convocation, DeclaredStatus } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { Section } from '@domain/entities/section'
import { filterBySection } from '@domain/rules/club-schedule-rules'
import type { ClubScheduleItem } from '@domain/usecases/club-overview/ListClubScheduleUseCase'
import { dayKey, groupConvocationTypesByDay, isPastDate } from '@domain/rules/convocation-rules'
import { canPlayerRespond } from '@domain/policies/response-deadline'
import { getMatchOutcome } from '@domain/policies/match-outcome-rules'
import type { ConvocationForCoach } from '@domain/usecases/coach-dashboard/ListTeamConvocationsUseCase'
import type { ConvocationForPlayer } from '@domain/usecases/player-dashboard/ListUConvocationsForPlayerUseCase'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import type { UiError } from '@presentation/shared/errors/ui-error'
import type { DashboardRole } from '@presentation/app/providers/active-role-provider'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useActiveTeam } from '@presentation/shared/hooks/use-active-team'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import { addMonths, addWeeks, formatMonthYear, getMonthGridDates, getWeekDates, isSameDay } from '@presentation/shared/formatters/calendar-date'
import { useCalendarDependencies } from '@presentation/di/hooks/use-calendar-dependencies'
import { useClubOverviewDependencies } from '@presentation/di/hooks/use-club-overview-dependencies'
import { toSectionLabelView } from '@presentation/shared/formatters/section-label'
import { useSectionFilter } from '@presentation/shared/hooks/use-section-filter'
import type { CalendarRangeMode } from './components/RangeModeToggle'
import type { CalendarDayInfo } from './components/calendar-day'
import type { CalendarListItem, CalendarMatchResult } from './components/calendar-list-item'
import type { CalendarResponseBlock } from './components/calendar-response-block'

// Développeuse, 2026-09-30 — AC-CA-15 override (see specs/calendar.md's own
// dated note): a PAST match's recorded score, same "no result before it's
// actually past/recorded" guard AC-MS-15 already enforces elsewhere. `null`
// covers every non-showing case at once (not a match, not past yet, score
// not recorded) rather than three separate booleans the row would have to
// re-check.
function buildMatchResult(convocation: Convocation, matchDetails: MatchDetails | null, now: Date): CalendarMatchResult | null {
  if (convocation.type !== 'match' || !isPastDate(convocation.date, now)) return null
  if (!matchDetails || matchDetails.goalsFor === null || matchDetails.goalsAgainst === null) return null
  return {
    outcome: getMatchOutcome(matchDetails.goalsFor, matchDetails.goalsAgainst),
    goalsFor: matchDetails.goalsFor,
    goalsAgainst: matchDetails.goalsAgainst,
  }
}

function buildCoachDayItems(items: ConvocationForCoach[], selectedDate: Date, now: Date): CalendarListItem[] {
  return items
    .filter((item) => isSameDay(new Date(item.convocation.date), selectedDate))
    .map((item): CalendarListItem => ({
      convocation: item.convocation,
      matchDetails: item.matchDetails,
      opponent: item.opponent,
      // ListTeamConvocationsUseCase doesn't resolve MeetingDetails (only
      // matchDetails/opponent) — same gap already accepted on UpcomingList's
      // own coach-side rows, not introduced here.
      meetingDetails: null,
      // Développeuse, 2026-09-30 — 'coach-past' once the échéance has
      // happened (ResponseCountsRecap, the denser recap), 'coach' while
      // upcoming (ResponseBar, the segmented bar). Same `responseCounts`
      // either way — only the rendering differs, see calendar-response-
      // block.ts's own comment.
      responseBlock: isPastDate(item.convocation.date, now)
        ? { kind: 'coach-past', counts: item.responseCounts }
        : { kind: 'coach', counts: item.responseCounts },
      matchResult: buildMatchResult(item.convocation, item.matchDetails, now),
      // Développeuse, 2026-09-30 — same "past + still open" signal as
      // useConvocationDetailViewModel's attendanceConfirmationMissing, coach
      // view only (this function is never called for a player item).
      attendanceConfirmationMissing: item.convocation.status === 'open' && isPastDate(item.convocation.date, now),
      sectionLabel: null,
      isOpenable: true,
    }))
}

// specs/mobile-dirigeant-habilite.md §1.2 — Dirigeant rows: same row content
// as the coach (rail, title, ScheduleInfo, opponent/RDV, cancelled badge, past
// match score) plus the section tag; NO response block, NO attendance alert
// (AC-DH-16), and NOT openable until the officer's detail variant exists
// (PO-DH-15). The section filter was already applied upstream.
function buildOfficerDayItems(items: ClubScheduleItem[], selectedDate: Date, now: Date, sectionsById: Map<string, Section>): CalendarListItem[] {
  return items
    .filter((item) => isSameDay(new Date(item.convocation.date), selectedDate))
    .map((item): CalendarListItem => ({
      convocation: item.convocation,
      matchDetails: item.matchDetails,
      opponent: item.opponent,
      meetingDetails: item.meetingDetails,
      responseBlock: { kind: 'none' },
      matchResult: buildMatchResult(item.convocation, item.matchDetails, now),
      attendanceConfirmationMissing: false,
      sectionLabel: toSectionLabelView(item.team, sectionsById),
      isOpenable: false,
    }))
}

function buildPlayerDayItems(
  items: ConvocationForPlayer[],
  selectedDate: Date,
  now: Date,
  hasRbacPermission: boolean,
  onRespond: (convocationId: string, status: Extract<DeclaredStatus, 'present' | 'absent'>) => void,
): CalendarListItem[] {
  return items
    .filter((item) => isSameDay(new Date(item.convocation.date), selectedDate))
    .map((item): CalendarListItem => {
      const myResponse = item.myResponse?.status ?? null
      const responseBlock: CalendarResponseBlock = isPastDate(item.convocation.date, now)
        ? { kind: 'player-readonly', myResponse }
        : {
          kind: 'player-actions',
          canRespond: canPlayerRespond(item.convocation, now) && hasRbacPermission,
          myResponse,
          onRespondPresent: () => onRespond(item.convocation.id, 'present'),
          onRespondAbsent: () => onRespond(item.convocation.id, 'absent'),
        }
      return {
        convocation: item.convocation,
        matchDetails: item.matchDetails,
        opponent: item.opponent,
        meetingDetails: item.meetingDetails,
        responseBlock,
        matchResult: buildMatchResult(item.convocation, item.matchDetails, now),
        // AC-CA-09 unaffected: a player never sees this signal (coach-only,
        // same reasoning as the coach-side computation above).
        attendanceConfirmationMissing: false,
        sectionLabel: null,
        isOpenable: true,
      }
    })
}

// §2 "Variantes de rendu par rôle", §3, PO-CA-02: one CalendarResponseBlock
// per convocation on `selectedDate` — coach gets the team-wide ResponseBar
// aggregate on every row, upcoming or past alike (AC-CA-03); player gets
// the read-only pill once the convocation is in the past (PO-CA-02) and the
// real Présent/Absent action pair otherwise, gated by both the
// response-deadline rule and the RBAC permission (neither alone is
// sufficient — CLAUDE.md §6, RLS is the real gate, this only decides
// whether to render the buttons at all). `DashboardRole` is `'coach' |
// 'player'` today, but PO-CA-06 (§5) is the standing debt that other roles
// (section-manager, treasurer, admin…) will eventually need a variant here
// too — this dispatcher is the single place that grows when that happens;
// until then, any role that isn't coach/player renders an honest empty
// list rather than falling through to one of the two existing branches.
function buildSelectedDayItems(
  role: DashboardRole,
  coachItems: ConvocationForCoach[],
  playerItems: ConvocationForPlayer[],
  officerItems: ClubScheduleItem[],
  sectionsById: Map<string, Section>,
  selectedDate: Date,
  now: Date,
  hasRbacPermission: boolean,
  onRespond: (convocationId: string, status: Extract<DeclaredStatus, 'present' | 'absent'>) => void,
): CalendarListItem[] {
  switch (role) {
    case 'authorized-officer':
      return buildOfficerDayItems(officerItems, selectedDate, now, sectionsById)
    case 'coach':
      return buildCoachDayItems(coachItems, selectedDate, now)
    case 'player':
      return buildPlayerDayItems(playerItems, selectedDate, now, hasRbacPermission, onRespond)
    default:
      return []
  }
}

export function useCalendarViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const queryClient = useQueryClient()
  const { activeRole, isOfficerView } = useActiveRole()
  const { selectedCoachTeamId } = useActiveTeam()
  const { sectionFilter, selectSection } = useSectionFilter()
  const { sectionRepository, listClubScheduleUseCase } = useClubOverviewDependencies()
  const {
    getCoachTeamsUseCase,
    getPlayerTeamUseCase,
    listTeamConvocationsUseCase,
    listConvocationsForPlayerUseCase,
    respondToConvocationUseCase,
  } = useCalendarDependencies()

  /// --- Team resolution ---
  // PO-CA-05/PO-6 resolved: shares ActiveTeamProvider's selection with
  // useCoachDashboardViewModel rather than re-deciding a team here — a
  // coach who picks a team on the dashboard sees the SAME team on the
  // Calendar, not a screen-local re-pick. `selectedCoachTeamId` is `null`
  // until the coach actually opens the dashboard's selector, so this falls
  // back to teamsQuery.data[0] exactly like the dashboard's own fallback —
  // identical default, just no longer a separate, independent choice.
  const coachAssignment = user?.roles.find((assignment) => assignment.role === 'coach')
  const coachTeamIds = coachAssignment?.teamIds ?? []
  const playerAssignment = user?.roles.find((assignment) => assignment.role === 'player')
  const playerTeamId = playerAssignment?.teamId

  const coachTeamsQuery = useQuery({
    queryKey: queryKeys.coachTeams(user?.id ?? ''),
    queryFn: () => getCoachTeamsUseCase.execute({ coachTeamIds }),
    enabled: activeRole === 'coach' && !!user && coachTeamIds.length > 0,
  })
  const currentCoachTeam =
    coachTeamsQuery.data?.find((summary) => summary.team.id === selectedCoachTeamId)?.team ?? coachTeamsQuery.data?.[0]?.team

  const playerTeamQuery = useQuery({
    queryKey: queryKeys.playerTeam(playerTeamId ?? ''),
    queryFn: () => getPlayerTeamUseCase.execute({ teamId: playerTeamId! }),
    enabled: activeRole === 'player' && !!playerTeamId,
  })

  /// --- Convocations in scope ---
  const coachConvocationsQuery = useQuery({
    queryKey: queryKeys.calendarTeamConvocations(currentCoachTeam?.id ?? ''),
    queryFn: () => listTeamConvocationsUseCase.execute({ teamId: currentCoachTeam!.id, now: new Date(), includePast: true }),
    enabled: activeRole === 'coach' && !!currentCoachTeam,
  })

  const playerConvocationsQuery = useQuery({
    queryKey: queryKeys.calendarPlayerConvocations(playerTeamId ?? '', user?.id ?? ''),
    // specs/calendar.md PO-CA-02 (tranché 2026-09-04): past échéances stay
    // in the list, read-only, for the player too — same `includePast: true`
    // as the coach query above. Omitting it here silently dropped every
    // past convocation (matches included) from the player's calendar.
    queryFn: () => listConvocationsForPlayerUseCase.execute({ teamId: playerTeamId!, userId: user!.id, now: new Date(), includePast: true }),
    enabled: activeRole === 'player' && !!playerTeamId && !!user,
  })

  /// --- Dirigeant scope (specs/mobile-dirigeant-habilite.md §1.2) ---
  // Every convocation of the current-season teams. The section filter is
  // applied client-side on this cached list (shared with the dashboard,
  // AC-DH-15), so changing it never refetches.
  const officerScheduleQuery = useQuery({
    queryKey: queryKeys.clubSchedule(),
    queryFn: () => listClubScheduleUseCase.execute({ includePast: true, now: new Date() }),
    enabled: isOfficerView,
  })
  const officerSectionsQuery = useQuery({
    queryKey: queryKeys.clubSections(),
    queryFn: () => sectionRepository.findAll(),
    enabled: isOfficerView,
  })
  const officerSections = officerSectionsQuery.data ?? []
  const sectionsById = new Map<string, Section>(officerSections.map((section) => [section.id, section]))
  const allOfficerItems = officerScheduleQuery.data ?? []
  const officerItems = filterBySection(allOfficerItems, sectionFilter)
  const activeSection = sectionFilter ? sectionsById.get(sectionFilter) : undefined

  /// --- Range navigation state (Sem/Mois, selected day) ---
  // Plain UI state, not a business rule (ARCHITECTURE.md §6 draws the line
  // at "decides what's true", and which toggle position or which day is
  // highlighted decides nothing about the data) — 'week' + today is the
  // default per UI design §2 ("état par défaut à l'ouverture, jour du jour
  // sélectionné").
  const [rangeMode, setRangeMode] = useState<CalendarRangeMode>('week')
  const [selectedDate, setSelectedDate] = useState<Date>(() => new Date())

  // Same minute-tick pattern as usePlayerDashboardViewModel/
  // useConvocationDetailViewModel — `now` needs to stay fresh for
  // canPlayerRespond to re-evaluate per row as response windows close
  // mid-session, and doubles as "today" for CalendarRangeNav's day cells.
  const [now, setNow] = useState(() => new Date())
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 60_000)
    return () => clearInterval(id)
  }, [])

  // Date-range math split across two layers (UI design §"Composant nouveau"
  // #1): getWeekDates/getMonthGridDates (presentation/shared/formatters/
  // calendar-date.ts) build the generic Monday-first date skeleton — no
  // Convocation involved, same category as isSameDay there. Grouping THIS
  // scope's convocations by calendar day is a Convocation-aware operation,
  // so it lives in domain/rules/convocation-rules.ts
  // (groupConvocationTypesByDay) alongside summarizeResponses/
  // byDateAscending, testable without React or mocks. This ViewModel only
  // composes the two: which convocations are "in scope" is role-branched
  // (coach sees the team's, player sees their own team's), then each date
  // in the skeleton is paired with its distinct types via `dayKey` — the
  // same key both sides agree on.
  const convocationsInScope: Convocation[] = isOfficerView
    ? officerItems.map((item) => item.convocation)
    : activeRole === 'coach'
      ? (coachConvocationsQuery.data ?? []).map((item) => item.convocation)
      : (playerConvocationsQuery.data ?? []).map((item) => item.convocation)
  const typesByDay = groupConvocationTypesByDay(convocationsInScope)

  const weekDays: CalendarDayInfo[] = getWeekDates(selectedDate).map((date) => ({
    date,
    types: typesByDay.get(dayKey(date)) ?? [],
  }))
  const monthWeeks: (CalendarDayInfo | null)[][] = getMonthGridDates(selectedDate).map((week) =>
    week.map((date) => (date ? { date, types: typesByDay.get(dayKey(date)) ?? [] } : null)),
  )

  // Trivial label swap, not a computed date range — safe to fill in as-is.
  const scopeLabel = rangeMode === 'week' ? 'Cette semaine' : 'Ce mois'
  const monthYearLabel = formatMonthYear(selectedDate)

  // UI design, Question ouverte 2 — resolved "non, laisser le jour revenir
  // vide": no season-boundary check here, addWeeks/addMonths shift freely
  // and a range with nothing in it just renders through
  // CalendarConvocationList's own empty state, same as any other empty day.
  function onNavigatePrevious() {
    setSelectedDate((current) => (rangeMode === 'week' ? addWeeks(current, -1) : addMonths(current, -1)))
  }
  function onNavigateNext() {
    setSelectedDate((current) => (rangeMode === 'week' ? addWeeks(current, 1) : addMonths(current, 1)))
  }

  function onSelectDate(date: Date) {
    setSelectedDate(date)
  }

  // Team-level RBAC only (doesn't vary per convocation) — combined below
  // with canPlayerRespond(convocation, now), which is what actually varies
  // per row (response-deadline elapsed, or convocation no longer 'open').
  // Hoisted above selectedDayItems (was declared further down) so that
  // derivation can read it without a temporal-dead-zone issue.
  const hasRbacPermission = usePermission('convocation:respond', { teamId: playerTeamId })

  /// --- Selected day's list, role-branched ---
  // See buildSelectedDayItems above for the per-role derivation itself.
  const selectedDayItems = buildSelectedDayItems(
    isOfficerView ? 'authorized-officer' : activeRole,
    coachConvocationsQuery.data ?? [],
    playerConvocationsQuery.data ?? [],
    officerItems,
    sectionsById,
    selectedDate,
    now,
    hasRbacPermission,
    onRespond,
  )

  // AC-CA-11 — collapses the WHOLE screen to the shared EmptyState (no
  // range nav at all, UI design §4) when there's no team resolved for the
  // active role, or the resolved team has zero convocations across the
  // WHOLE scope (not just `selectedDate` — CalendarConvocationList's own
  // lighter "Aucun événement ce jour" already covers that narrower case).
  // Narrower than AC-CA-11's full wording: "aucune saison en cours" isn't
  // checked — CalendarContainer wires a SeasonRepository but nothing reads
  // it yet, and no other screen in the app currently derives this from a
  // ViewModel either, so it's flagged here rather than faked.
  // Dirigeant: the "scope" is the whole club (unfiltered) — an active filter
  // that matches nothing keeps the range nav and shows the filtered-empty
  // state of the list instead of collapsing the screen.
  const hasResolvedTeam = isOfficerView ? true : activeRole === 'coach' ? !!currentCoachTeam : !!playerTeamId
  const hasAnyConvocationInScope = isOfficerView
    ? allOfficerItems.length > 0
    : hasResolvedTeam && convocationsInScope.length > 0

  /// --- Respond action (player only) ---
  // Same mechanism as usePlayerDashboardViewModel.respondMutation
  // (RespondToConvocationUseCase, upsert, AC-CA-06 single row per
  // convocation/user) — generalized to take `convocationId` as a mutation
  // variable instead of a single fixed "next convocation", since this
  // screen can respond from any row, not just one.
  const [respondError, setRespondError] = useState<UiError | null>(null)

  const respondMutation = useMutation({
    mutationFn: (input: { convocationId: string; status: Extract<DeclaredStatus, 'present' | 'absent'> }) => {
      if (!user) {
        return Promise.reject(new Error('no user'))
      }
      return respondToConvocationUseCase.execute({
        convocationId: input.convocationId,
        userId: user.id,
        status: input.status,
        now: new Date(),
      })
    },
    onMutate: () => setRespondError(null),
    onSuccess: (_response, variables) => {
      setRespondError(null)
      if (playerTeamId && user) {
        void queryClient.invalidateQueries({ queryKey: queryKeys.calendarPlayerConvocations(playerTeamId, user.id) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.playerConvocationResponse(variables.convocationId, user.id) })
        void queryClient.invalidateQueries({ queryKey: queryKeys.convocationResponders(variables.convocationId) })
      }
    },
    onError: (error) => setRespondError(mapDomainErrorToUiError(error)),
  })

  // Exposed as `onRespond` below for the TODO above to wire each row's
  // `onRespondPresent`/`onRespondAbsent` to (e.g.
  // `() => onRespond(convocation.id, 'present')`) once selectedDayItems is
  // actually built — not called from anywhere yet (selectedDayItems is
  // still `[]`), same duplicate-upsert guard shape as
  // usePlayerDashboardViewModel's onRespondPresent/onRespondAbsent.
  function onRespond(convocationId: string, status: Extract<DeclaredStatus, 'present' | 'absent'>) {
    if (respondMutation.isPending) return
    respondMutation.mutate({ convocationId, status })
  }

  return {
    isLoading:
      coachTeamsQuery.isLoading ||
      playerTeamQuery.isLoading ||
      coachConvocationsQuery.isLoading ||
      playerConvocationsQuery.isLoading ||
      officerScheduleQuery.isLoading,
    error:
      coachTeamsQuery.error ??
      playerTeamQuery.error ??
      coachConvocationsQuery.error ??
      playerConvocationsQuery.error ??
      officerScheduleQuery.error,

    hasAnyConvocationInScope,

    /// --- Header ---
    monthYearLabel,

    /// --- Range nav ---
    rangeMode,
    onChangeRangeMode: setRangeMode,
    scopeLabel,
    onNavigatePrevious,
    onNavigateNext,
    selectedDate,
    today: now,
    onSelectDate,
    weekDays,
    monthWeeks,

    /// --- Selected day's list ---
    selectedDayItems,
    hasRespondPermission: hasRbacPermission,
    onRespond,
    respondError,

    /// --- Dirigeant section filter (null for every other view) ---
    sectionFilter: isOfficerView
      ? {
          sections: officerSections,
          selectedSectionId: sectionFilter,
          activeSectionName: activeSection?.name ?? null,
          ariaLabel: activeSection ? `Filtrer par section, ${activeSection.name} actif` : 'Filtrer par section',
          emptyDayLabel: activeSection ? `Aucun événement pour ${activeSection.name} ce jour` : null,
          onSelect: selectSection,
          onClear: () => selectSection(null),
        }
      : null,

    /// --- Navigation ---
    goToConvocationDetail: (convocationId: string) => {
      if (!convocationId) return
      navigate(`/convocations/${convocationId}`)
    },
  }
}
