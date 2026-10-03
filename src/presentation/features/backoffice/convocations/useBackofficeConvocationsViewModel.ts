import { useEffect, useState } from 'react'
import { useInfiniteQuery, useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { AdminConvocationFilters, AdminConvocationPeriod } from '@domain/entities/admin-convocation'
import type { ConvocationType } from '@domain/entities/convocation'
import { useConvocationAdminDependencies } from '@presentation/di/hooks/use-convocation-admin-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { useNow } from '@presentation/shared/hooks/use-now'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { queryKeys } from '@presentation/shared/query-keys'
import {
  DEFAULT_CONVOCATION_FILTER_STATE,
  isConvocationFilterActive,
  isOnlyUnrecordedFilterActive,
  teamsForFilters,
  type ConvocationFilterState,
} from './convocation-filters'
import { addMonths, monthRange, startOfMonth } from './calendar-grid'
import { toConvocationRowView } from './convocation-row-view'
import { useBackofficeFiltersCollapsed } from '@presentation/features/backoffice/shared/hooks/use-backoffice-filters-collapsed'

export type ConvocationsViewMode = 'list' | 'calendar'

// specs/web-create-convocation.md AC-WC-06/AC-WC-09/AC-WC-10/AC-WC-11 — all
// the logic of the list screen. Filters, the "Présences non saisies" pastille
// and its count, and pagination are executed server-side through the use case;
// the Page only branches on the booleans computed here.
//
// Pagination reset: queryKeys.adminConvocationsList(...) is discriminated by
// the filters, so changing any of them starts that key's own cache entry at
// page 0 — nothing hand-rolled (same reasoning as useBackofficeAuditViewModel).
export function useBackofficeConvocationsViewModel() {
  const { listAdminConvocationsUseCase, adminConvocationRepository, seasonRepository, sectionRepository, teamRepository } = useConvocationAdminDependencies()
  const navigate = useNavigate()
  const now = useNow()
  const canCreate = usePermission('convocation:create')

  const [filterState, setFilterState] = useState<ConvocationFilterState>(DEFAULT_CONVOCATION_FILTER_STATE)
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(new Set())
  const [viewMode, setViewMode] = useState<ConvocationsViewMode>('list')
  const [month, setMonth] = useState(() => startOfMonth(new Date()))
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const isCalendar = viewMode === 'calendar'

  // Reference data for the selects (plain passthrough reads, RLS-bounded).
  const seasonsQuery = useQuery({
    queryKey: queryKeys.seasonsAdminList(),
    queryFn: () => seasonRepository.findAll(),
  })
  const currentSeasonQuery = useQuery({
    queryKey: queryKeys.seasonCurrent(),
    queryFn: () => seasonRepository.findCurrent(),
  })
  const sectionsQuery = useQuery({
    queryKey: queryKeys.sectionsAdminList(),
    queryFn: () => sectionRepository.findAll(),
  })
  const teamsQuery = useQuery({
    queryKey: queryKeys.teamsAdminList(),
    queryFn: () => teamRepository.findAllForAdmin(),
  })

  // PO-WC-10 — the current season is the default (state `null` = default).
  const currentSeasonId = currentSeasonQuery.data?.id ?? null
  const effectiveSeasonId = filterState.seasonId ?? currentSeasonId

  const filters: AdminConvocationFilters = {
    seasonId: effectiveSeasonId,
    sectionId: filterState.sectionId,
    teamId: filterState.teamId,
    type: filterState.type,
    // The calendar shows whole months: the period segments don't apply there.
    period: isCalendar ? 'all' : filterState.period,
    unrecordedOnly: filterState.unrecordedOnly,
    ...(isCalendar ? { dateRange: monthRange(month) } : {}),
  }

  // Wait for the default season to be known so the first request already
  // carries it (no flash of an unfiltered list).
  const isSeasonResolved = !currentSeasonQuery.isPending

  const listQuery = useInfiniteQuery({
    queryKey: queryKeys.adminConvocationsList(filters),
    queryFn: ({ pageParam }) =>
      listAdminConvocationsUseCase.execute({
        filters,
        page: pageParam,
        now: new Date(),
      }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
    enabled: isSeasonResolved,
  })

  // PO-WC-04 (proposed) — N on the selected season alone, independent of the
  // other filters, so it stays stable when the pastille is toggled.
  const unrecordedCountQuery = useQuery({
    queryKey: queryKeys.adminConvocationsUnrecordedCount(effectiveSeasonId),
    queryFn: () => adminConvocationRepository.countUnrecorded(effectiveSeasonId, new Date()),
    enabled: isSeasonResolved,
  })

  // A month can hold more than one page: load them all so the grid is complete.
  const { hasNextPage, isFetchingNextPage, fetchNextPage } = listQuery
  useEffect(() => {
    if (isCalendar && hasNextPage && !isFetchingNextPage) void fetchNextPage()
  }, [isCalendar, hasNextPage, isFetchingNextPage, fetchNextPage])

  const rows = (listQuery.data?.pages.flatMap((page) => page.items) ?? []).map((item) => toConvocationRowView(item, now))
  const isLoading = listQuery.isLoading || !isSeasonResolved
  const selectedRow = rows.find((row) => row.id === selectedId) ?? null
  const error = listQuery.error ? mapDomainErrorToUiError(listQuery.error) : null
  const isFilterActive = isConvocationFilterActive(filterState, currentSeasonId)
  const onlyUnrecordedActive = isOnlyUnrecordedFilterActive(filterState, currentSeasonId)

  const teamOptions = teamsForFilters(teamsQuery.data ?? [], effectiveSeasonId, filterState.sectionId)

  function update(patch: Partial<ConvocationFilterState>) {
    setFilterState((current) => ({ ...current, ...patch }))
  }

  function toggleExpanded(id: string) {
    setExpandedIds((current) => {
      const next = new Set(current)
      if (next.has(id)) next.delete(id)
      else next.add(id)
      return next
    })
  }

  const { areFiltersCollapsed, toggleFiltersCollapsed } = useBackofficeFiltersCollapsed('convocations')

  return {
    areFiltersCollapsed,
    toggleFiltersCollapsed,
    canCreate,
    isLoading,
    error,
    rows,
    expandedIds,
    toggleExpanded,

    // Calendar view — same filters and rows, laid out by month.
    viewMode,
    setViewMode,
    month,
    showPreviousMonth: () => setMonth((current) => addMonths(current, -1)),
    showNextMonth: () => setMonth((current) => addMonths(current, 1)),
    showToday: () => setMonth(startOfMonth(new Date())),
    selectedRow,
    selectRow: setSelectedId,
    clearSelectedRow: () => setSelectedId(null),

    // AC-WC-10 — four distinct states. `isEmpty*` all require a settled,
    // successful, empty first page.
    isEmpty: !isLoading && !error && rows.length === 0 && !isFilterActive && !isCalendar,
    isEmptyFiltered: !isLoading && !error && rows.length === 0 && isFilterActive && !onlyUnrecordedActive && !isCalendar,
    isEmptyAllRecorded: !isLoading && !error && rows.length === 0 && onlyUnrecordedActive && !isCalendar,
    retry: () => {
      void listQuery.refetch()
    },

    // Filters
    seasons: seasonsQuery.data ?? [],
    sections: sectionsQuery.data ?? [],
    teamOptions,
    seasonId: effectiveSeasonId,
    sectionId: filterState.sectionId,
    teamId: filterState.teamId,
    type: filterState.type,
    period: filterState.period,
    unrecordedOnly: filterState.unrecordedOnly,
    unrecordedCount: unrecordedCountQuery.data ?? 0,
    isFilterActive,
    setSeasonId: (seasonId: string) => update({ seasonId, teamId: null }),
    // Changing the section puts the team back on "Toutes équipes".
    setSectionId: (sectionId: string | null) => update({ sectionId, teamId: null }),
    setTeamId: (teamId: string | null) => update({ teamId }),
    setType: (type: ConvocationType | null) => update({ type }),
    setPeriod: (period: AdminConvocationPeriod) => update({ period }),
    toggleUnrecordedOnly: () => update({ unrecordedOnly: !filterState.unrecordedOnly }),
    resetFilters: () => setFilterState(DEFAULT_CONVOCATION_FILTER_STATE),

    // Pagination — "Charger plus", absent (not disabled) on the last page.
    hasMore: !isCalendar && (listQuery.hasNextPage ?? false),
    isFetchingNextPage: listQuery.isFetchingNextPage,
    loadMore: () => {
      void listQuery.fetchNextPage()
    },

    goToCreate: () => navigate('/admin/convocations/new'),
    goToEdit: (id: string) => navigate(`/admin/convocations/${id}/edit`),
    goToAttendance: (id: string) => navigate(`/admin/convocations/${id}/attendance`),
  }
}

export type BackofficeConvocationsViewModel = ReturnType<typeof useBackofficeConvocationsViewModel>
