import { useState } from 'react'
import { useInfiniteQuery } from '@tanstack/react-query'
import { AUDIT_ACTIONS, type AuditAction } from '@domain/policies/audit-actions'
import type { AuditLogFilters } from '@domain/repositories/audit-log-repository'
import { useAuditLogDependencies } from '@presentation/di/hooks/use-audit-log-dependencies'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { queryKeys } from '@presentation/shared/query-keys'
import { toAuditLogDateRange } from './audit-log-date-range'
import { useBackofficeFiltersCollapsed } from '@presentation/features/backoffice/shared/hooks/use-backoffice-filters-collapsed'

// specs/web-audit-logs.md §2.6/§2.7/AC-AU-12/AC-AU-13/AC-AU-24 — all the
// logic lives here (ARCHITECTURE.md §6): the two date-only strings and the
// selected-actions set, converted into AuditLogFilters via the pure
// toAuditLogDateRange(), passed to ListAuditLogUseCase's `queryFn` —
// BackofficeAuditPage only ever branches on booleans this hook computes.
//
// Pagination reset (AC-AU-13, "un changement de filtre réinitialise la
// pagination") is NOT hand-rolled here: queryKeys.auditLog(...) is
// discriminated by the filters themselves, so changing any of them changes
// the queryKey — useInfiniteQuery starts that key's own cache entry fresh,
// at page 0, for free. This is exactly the point ARCHITECTURE.md §6 makes
// about fixing the queryKey shape up front rather than reaching for a
// manual `setPages([])` call.
export function useBackofficeAuditViewModel() {
  const { listAuditLogUseCase } = useAuditLogDependencies()

  const [fromDate, setFromDate] = useState('') // 'YYYY-MM-DD' or '' (no lower bound)
  const [toDate, setToDate] = useState('') // 'YYYY-MM-DD' or '' (no upper bound)
  const [selectedActions, setSelectedActions] = useState<AuditAction[]>([])

  const dateRange = toAuditLogDateRange(fromDate || null, toDate || null)
  const filters: AuditLogFilters = {
    from: dateRange.from,
    to: dateRange.to,
    actions: selectedActions.length > 0 ? selectedActions : undefined,
  }

  const sortedActions = [...selectedActions].sort()
  const queryKey = queryKeys.auditLog({
    from: dateRange.from ? dateRange.from.toISOString() : null,
    to: dateRange.to ? dateRange.to.toISOString() : null,
    actions: sortedActions,
  })

  const query = useInfiniteQuery({
    queryKey,
    queryFn: ({ pageParam }) => listAuditLogUseCase.execute({ filters, page: pageParam }),
    initialPageParam: 0,
    getNextPageParam: (lastPage, allPages) => (lastPage.hasMore ? allPages.length : undefined),
  })

  const entries = query.data?.pages.flatMap((page) => page.entries) ?? []
  const isLoading = query.isLoading
  const error = query.error ? mapDomainErrorToUiError(query.error) : null

  // §2.6/UI design — counts as an ACTIVE filter the instant the admin
  // touches any of the three controls, same "isFilterActive" shape as
  // useBackofficeMembershipsViewModel — distinguishes the AC-AU-18 (a) empty
  // state (no filter, nominal for this pass) from (b) (filters applied, no
  // match).
  const isFilterActive = fromDate !== '' || toDate !== '' || selectedActions.length > 0

  function toggleAction(action: AuditAction) {
    setSelectedActions((current) => (current.includes(action) ? current.filter((value) => value !== action) : [...current, action]))
  }

  function resetFilters() {
    setFromDate('')
    setToDate('')
    setSelectedActions([])
  }

  const { areFiltersCollapsed, toggleFiltersCollapsed } = useBackofficeFiltersCollapsed('audit')

  return {
    areFiltersCollapsed,
    toggleFiltersCollapsed,
    isLoading,
    error,
    entries,
    isFilterActive,
    // AC-AU-18 — three distinct states, never confused: (a) nominal empty
    // (no filter — the expected state for this pass, zero emitters built
    // yet), (b) filtered-empty (a filter narrowed the result to nothing),
    // both requiring !isLoading && !error && entries.length === 0.
    isEmpty: !isLoading && !error && entries.length === 0 && !isFilterActive,
    isEmptyFiltered: !isLoading && !error && entries.length === 0 && isFilterActive,

    fromDate,
    setFromDate,
    toDate,
    setToDate,
    selectedActions,
    toggleAction,
    selectAllActions: () => setSelectedActions([...AUDIT_ACTIONS]),
    clearActions: () => setSelectedActions([]),
    resetFilters,

    // AC-AU-13 — "charger plus" appends, never replaces/reorders what's
    // already rendered; absent (not disabled) once the last page received
    // fewer than AUDIT_LOG_PAGE_SIZE rows (query.hasNextPage already
    // encodes that, via getNextPageParam above).
    hasMore: query.hasNextPage ?? false,
    isFetchingNextPage: query.isFetchingNextPage,
    loadMore: () => {
      void query.fetchNextPage()
    },
  }
}
