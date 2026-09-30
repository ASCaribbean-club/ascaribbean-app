import { createElement, type ReactNode } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AuditLogEntry } from '@domain/entities/audit-log-entry'
import type { AuditLogPage } from '@domain/repositories/audit-log-repository'
import { useAuditLogDependencies } from '@presentation/di/hooks/use-audit-log-dependencies'
import { useBackofficeAuditViewModel } from './useBackofficeAuditViewModel'

// specs/web-audit-logs.md §2.6/§2.7/AC-AU-13 — the one piece of real derived
// logic in this ViewModel worth a dedicated test (ARCHITECTURE.md §8's own
// "ciblé sur les écrans critiques" carve-out for ViewModel tests): a filter
// change must reset pagination back to page 0, never mix pages fetched
// under two different filter sets.

vi.mock('@presentation/di/hooks/use-audit-log-dependencies')

const mockedUseAuditLogDependencies = vi.mocked(useAuditLogDependencies)

function buildEntry(overrides: Partial<AuditLogEntry> = {}): AuditLogEntry {
  return {
    id: 'entry-1',
    occurredAt: new Date('2026-01-10T10:00:00.000Z'),
    actorId: 'admin-1',
    actorFullName: 'Compte administrateur',
    action: 'role.granted',
    targetId: 'target-1',
    targetType: 'user',
    source: 'usecase',
    metadata: {},
    ...overrides,
  }
}

function fullPage(prefix: string): AuditLogPage {
  return {
    entries: Array.from({ length: 50 }, (_, index) => buildEntry({ id: `${prefix}-${index}` })),
    hasMore: true,
  }
}

function renderViewModel(execute: ReturnType<typeof vi.fn>) {
  mockedUseAuditLogDependencies.mockReturnValue({
    auditLogRepository: {} as never,
    listAuditLogUseCase: { execute },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: ReactNode }) => createElement(QueryClientProvider, { client: queryClient }, children)

  return renderHook(() => useBackofficeAuditViewModel(), { wrapper })
}

describe('useBackofficeAuditViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC-AU-13 — loading a second page accumulates entries under the current filters', async () => {
    const execute = vi.fn().mockImplementation(({ page }: { page: number }) =>
      Promise.resolve(page === 0 ? fullPage('page0') : { entries: [buildEntry({ id: 'page1-0' })], hasMore: false }),
    )
    const { result } = renderViewModel(execute)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.entries).toHaveLength(50)
    expect(result.current.hasMore).toBe(true)

    await act(async () => {
      result.current.loadMore()
    })
    await waitFor(() => expect(result.current.entries).toHaveLength(51))
    expect(result.current.hasMore).toBe(false)
  })

  // AC-AU-13/AC-AU-12 — the core assertion: after loading page 2 (51 rows
  // accumulated above), CHANGING a filter must throw that accumulation away
  // and start over at page 0 under the new filter's own query key — never
  // silently keep the old pages mixed in with the new filter's results.
  it('AC-AU-13 — changing a filter resets pagination back to page 0, discarding previously loaded pages', async () => {
    const execute = vi.fn().mockImplementation(({ filters, page }: { filters: { actions?: string[] }; page: number }) => {
      if (filters.actions?.includes('role.granted')) {
        return Promise.resolve({ entries: [buildEntry({ id: 'filtered-0', action: 'role.granted' })], hasMore: false })
      }
      return Promise.resolve(page === 0 ? fullPage('page0') : { entries: [buildEntry({ id: 'page1-0' })], hasMore: false })
    })
    const { result } = renderViewModel(execute)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.entries).toHaveLength(50)

    await act(async () => {
      result.current.loadMore()
    })
    await waitFor(() => expect(result.current.entries).toHaveLength(51))

    // Changing the action filter — a brand-new queryKey (queryKeys.auditLog
    // is discriminated by the filters themselves), so useInfiniteQuery
    // starts a fresh cache entry at page 0 rather than appending.
    act(() => {
      result.current.toggleAction('role.granted')
    })

    await waitFor(() => expect(result.current.entries).toHaveLength(1))
    expect(result.current.entries[0].id).toBe('filtered-0')
    expect(result.current.hasMore).toBe(false)

    // Every call after the filter change carried page 0 first — proves the
    // reset, not just a coincidentally-short result.
    const callsAfterFilterChange = execute.mock.calls.filter(([input]) => input.filters.actions?.includes('role.granted'))
    expect(callsAfterFilterChange[0][0].page).toBe(0)
  })

  it('isFilterActive is false with no filter touched, true once a date or action filter is set', async () => {
    const execute = vi.fn().mockResolvedValue({ entries: [], hasMore: false })
    const { result } = renderViewModel(execute)

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.isFilterActive).toBe(false)
    expect(result.current.isEmpty).toBe(true)
    expect(result.current.isEmptyFiltered).toBe(false)

    act(() => {
      result.current.setFromDate('2026-01-01')
    })

    await waitFor(() => expect(result.current.isFilterActive).toBe(true))
    await waitFor(() => expect(result.current.isEmptyFiltered).toBe(true))
    expect(result.current.isEmpty).toBe(false)
  })

  it('resetFilters clears every filter back to its default', async () => {
    const execute = vi.fn().mockResolvedValue({ entries: [], hasMore: false })
    const { result } = renderViewModel(execute)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => {
      result.current.setFromDate('2026-01-01')
      result.current.setToDate('2026-01-31')
      result.current.toggleAction('role.granted')
    })
    await waitFor(() => expect(result.current.isFilterActive).toBe(true))

    act(() => {
      result.current.resetFilters()
    })

    expect(result.current.fromDate).toBe('')
    expect(result.current.toDate).toBe('')
    expect(result.current.selectedActions).toEqual([])
    await waitFor(() => expect(result.current.isFilterActive).toBe(false))
  })
})
