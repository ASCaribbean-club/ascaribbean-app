import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { Section } from '@domain/entities/section'
import { countEventsInWeek, filterBySection, selectUpcoming } from '@domain/rules/club-schedule-rules'
import { useClubOverviewDependencies } from '@presentation/di/hooks/use-club-overview-dependencies'
import { getFirstName, getInitials } from '@presentation/shared/formatters/greeting'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useNow } from '@presentation/shared/hooks/use-now'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useSectionFilter } from '@presentation/shared/hooks/use-section-filter'
import { queryKeys } from '@presentation/shared/query-keys'
import { toDirigeantEventView } from './dirigeant-event-view'

// specs/mobile-dirigeant-habilite.md §1.1 — Dirigeant dashboard. Tiles and the
// context line are club-wide (never follow the filter, AC-DH-05); the next
// event card and the "À venir" list follow the section filter (AC-DH-09).
export function useDirigeantDashboardViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const now = useNow()
  const { isOfficerView } = useActiveRole()
  const { sectionFilter, selectSection } = useSectionFilter()
  const { sectionRepository, getClubOverviewUseCase, listClubScheduleUseCase } = useClubOverviewDependencies()

  const sectionsQuery = useQuery({
    queryKey: queryKeys.clubSections(),
    queryFn: () => sectionRepository.findAll(),
    enabled: isOfficerView,
  })

  // Counters: their own failure only blanks the tiles ("—"), never the screen.
  const overviewQuery = useQuery({
    queryKey: queryKeys.clubOverview(),
    queryFn: () => getClubOverviewUseCase.execute(),
    enabled: isOfficerView,
  })

  const scheduleQuery = useQuery({
    queryKey: queryKeys.clubSchedule(),
    queryFn: () => listClubScheduleUseCase.execute({ includePast: true, now: new Date() }),
    enabled: isOfficerView,
  })

  const sections = sectionsQuery.data ?? []
  const sectionsById = new Map<string, Section>(sections.map((section) => [section.id, section]))
  const selectedSection = sectionFilter ? sectionsById.get(sectionFilter) : undefined

  const allItems = scheduleQuery.data ?? []
  const upcoming = selectUpcoming(filterBySection(allItems, sectionFilter), now).map((item) =>
    toDirigeantEventView(item, sectionsById),
  )
  const nextEvent = upcoming[0] ?? null
  const upcomingList = upcoming.slice(1)

  const sectionsCount = overviewQuery.data?.sectionsCount ?? null
  const membersCount = overviewQuery.data?.membersCount ?? null
  const eventsThisWeek = scheduleQuery.data ? countEventsInWeek(allItems, now) : null

  // "Club entier · 4 sections · 120 licenciés" — a missing counter is omitted.
  const contextLabel = [
    'Club entier',
    sectionsCount !== null ? `${sectionsCount} section${sectionsCount > 1 ? 's' : ''}` : null,
    membersCount !== null ? `${membersCount} licencié${membersCount > 1 ? 's' : ''}` : null,
  ]
    .filter((part): part is string => part !== null)
    .join(' · ')

  const canCreateConvocation = usePermission('convocation:create')

  return {
    isScheduleLoading: scheduleQuery.isLoading,
    hasScheduleError: scheduleQuery.isError,
    retrySchedule: () => void scheduleQuery.refetch(),
    areSectionsLoading: sectionsQuery.isLoading,

    /// --- Header ---
    firstName: user ? getFirstName(user.fullName) : '',
    initials: user ? getInitials(user.fullName) : '',
    contextLabel,
    goToProfilePage: () => {
      if (!user) return
      navigate('/profile')
    },

    /// --- Tiles (club-wide, never filtered) ---
    tiles: [
      { key: 'sections', label: 'Sections', value: sectionsCount },
      { key: 'members', label: 'Licenciés', value: membersCount },
      { key: 'events', label: 'Événements cette semaine', value: eventsThisWeek },
    ],

    /// --- Section filter ---
    sections,
    selectedSectionId: sectionFilter,
    // A re-tap on the active chip yields an empty value: ignored, "Toutes"
    // is the only neutral state.
    onSelectSection: (value: string) => {
      if (!value) return
      selectSection(value === 'all' ? null : value)
    },

    /// --- Next event + list (follow the filter) ---
    nextEvent,
    upcomingList,
    upcomingTitle: `À venir — ${selectedSection ? selectedSection.name : 'Toutes les sections'}`,
    goToCalendar: () => navigate('/calendar'),
    openConvocationDetail: (convocationId: string) => navigate(`/convocations/${convocationId}`),

    /// --- Floating "+" (creates a convocation, §1.4) ---
    canCreateConvocation,
    openConvocationCreate: () => navigate('/convocations/new'),
  }
}
