import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { useMissingRoleAlert } from './useMissingRoleAlert'

// specs/web-dashboard.md §2.5/AC-WD-17/AC-WD-18 — the piège the spec spells
// out explicitly: this hook counts the ONE criterion `hasRole`, never
// `hasMissingElement()`'s four-criteria OR, and reads that fact straight off
// AdminUserDirectoryEntry rather than re-deriving it from `roles.length`.

vi.mock('@presentation/di/hooks/use-users-dependencies')

const mockedUseUsersDependencies = vi.mocked(useUsersDependencies)

function buildEntry(overrides: Partial<AdminUserDirectoryEntry> = {}): AdminUserDirectoryEntry {
  return {
    id: 'user-1',
    fullName: 'Compte Un',
    email: 'compte-un@example.test',
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    roles: [],
    missingElementFacts: { hasRole: false, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: true },
    ...overrides,
  }
}

function renderAlert(entries: AdminUserDirectoryEntry[]) {
  mockedUseUsersDependencies.mockReturnValue({
    userRepository: { findAdminDirectory: vi.fn().mockResolvedValue(entries) },
    seasonRepository: { findCurrent: vi.fn().mockResolvedValue({ id: 'season-1', label: '2025-2026', startDate: '', endDate: '', cotisationAmount: null }) },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return renderHook(() => useMissingRoleAlert(), { wrapper })
}

describe('useMissingRoleAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC-WD-17 — counts only accounts missing hasRole, ignoring the other three completeness criteria', async () => {
    const entries = [
      buildEntry({ id: 'u1', missingElementFacts: { hasRole: false, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: true } }),
      // Missing THREE other criteria, but hasRole IS true — must NOT be counted here (that's hasMissingElement()'s job, elsewhere).
      buildEntry({ id: 'u2', missingElementFacts: { hasRole: true, hasMembershipForCurrentSeason: false, hasLicenceNumberForCurrentSeason: false, charterAccepted: false } }),
    ]
    const { result } = renderAlert(entries)

    await waitFor(() => expect(result.current.count).toBe(1))
    expect(result.current.names).toEqual(['Compte Un'])
  })

  it('AC-WD-18 — reads hasRole straight off missingElementFacts, never re-derived from roles.length', async () => {
    // A "ghost" case that could never happen via real data (roles is empty
    // AND hasRole is true) — proves the hook trusts the FACT, not the array.
    const entries = [buildEntry({ id: 'u1', roles: [], missingElementFacts: { hasRole: true, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: true } })]
    const { result } = renderAlert(entries)

    await waitFor(() => expect(result.current.count).toBe(0))
  })

  it('returns 0 and no names when every account carries a role', async () => {
    const entries = [buildEntry({ missingElementFacts: { hasRole: true, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: true } })]
    const { result } = renderAlert(entries)

    await waitFor(() => expect(result.current.count).toBe(0))
    expect(result.current.names).toEqual([])
  })
})
