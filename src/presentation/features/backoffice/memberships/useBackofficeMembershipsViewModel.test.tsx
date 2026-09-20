import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Membership } from '@domain/entities/membership'
import type { User } from '@domain/entities/user'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useBackofficeMembershipsViewModel } from './useBackofficeMembershipsViewModel'

// specs/web-users-membership-column.md §2.3a/AC-WU-58 — the real new derived
// logic this amendment adds to this ViewModel (CLAUDE.md §8 carve-out): the
// ?user= URL param branched onto the existing client-side filter chain,
// counted by isFilterActive, resolved to a display name via the ONE new
// read (UserRepository.findById(), gated on the param's presence), and
// cleared in one gesture back to the screen's default state. The most
// important case is the regression one: absent, nothing here may differ
// from before this amendment.

vi.mock('@presentation/di/hooks/use-memberships-dependencies')
vi.mock('@presentation/shared/hooks/use-auth')
vi.mock('@presentation/shared/hooks/use-permission')

const mockedUseMembershipsDependencies = vi.mocked(useMembershipsDependencies)
const mockedUseAuth = vi.mocked(useAuth)
const mockedUsePermission = vi.mocked(usePermission)

function buildMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'membership-1',
    userId: 'user-1',
    licenceNumber: 'FR-1',
    status: 'active',
    seasonId: 'season-1',
    validUntil: '2027-06-30',
    amountDueCents: null,
    ...overrides,
  }
}

function buildUser(overrides: Partial<User> = {}): User {
  return {
    id: 'user-1',
    fullName: 'Compte Un',
    email: 'compte-un@example.test',
    roles: [],
    position: null,
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    ...overrides,
  }
}

function renderViewModel({
  memberships,
  findByIdImpl,
  archive = vi.fn().mockResolvedValue(undefined),
  route = '/admin/memberships',
}: {
  memberships: Membership[]
  findByIdImpl?: ReturnType<typeof vi.fn>
  archive?: ReturnType<typeof vi.fn>
  route?: string
}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.test', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: new Date() },
    isLoading: false,
    refreshUser: vi.fn(),
  } as never)
  mockedUsePermission.mockReturnValue(true)
  const findById = findByIdImpl ?? vi.fn().mockResolvedValue(null)
  mockedUseMembershipsDependencies.mockReturnValue({
    membershipRepository: { findAllForAdmin: vi.fn().mockResolvedValue(memberships) },
    userRepository: { findAll: vi.fn().mockResolvedValue([]), findById },
    seasonRepository: {
      findAll: vi.fn().mockResolvedValue([{ id: 'season-1', label: '2025-2026', startDate: '2000-01-01', endDate: '2999-12-31', cotisationAmount: null }]),
      findCurrent: vi.fn().mockResolvedValue({ id: 'season-1', label: '2025-2026', startDate: '2000-01-01', endDate: '2999-12-31', cotisationAmount: null }),
    },
    paymentRepository: { findAllForAdmin: vi.fn().mockResolvedValue([]) },
    archiveMembershipUseCase: { execute: archive },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  const rendered = renderHook(() => useBackofficeMembershipsViewModel(), { wrapper })
  return { ...rendered, findById, archive, invalidateSpy }
}

describe('useBackofficeMembershipsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC-WU-58 — non-negotiable: no ?user= param must behave byte-identically
  // to before this amendment.
  it('AC-WU-58 — with no ?user= param, userFilter is null, isFilterActive is false, and findById is never called', async () => {
    const rows = [buildMembership({ id: 'm-1', userId: 'user-1' }), buildMembership({ id: 'm-2', userId: 'user-2' })]
    const { result, findById } = renderViewModel({ memberships: rows })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.userFilter).toBeNull()
    expect(result.current.filteredUserName).toBeNull()
    expect(result.current.isFilterActive).toBe(false)
    expect(result.current.rows).toHaveLength(2)
    expect(findById).not.toHaveBeenCalled()
  })

  it('AC-WU-58 — a ?user= param restricts the already-loaded list, client-side, to that account', async () => {
    const rows = [buildMembership({ id: 'm-1', userId: 'user-1' }), buildMembership({ id: 'm-2', userId: 'user-2' })]
    const { result } = renderViewModel({ memberships: rows, route: '/admin/memberships?user=user-2' })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.userFilter).toBe('user-2')
    expect(result.current.rows.map((row) => row.membership.id)).toEqual(['m-2'])
    expect(result.current.isFilterActive).toBe(true)
  })

  // §2.3c — the nominal landing case: current season × a freshly-invited
  // account = zero rows. isFilterActive must still be true so the caller
  // renders "Aucune adhésion ne correspond à ces filtres", never the
  // club-startup empty state.
  it('§2.3c — a ?user= param matching zero rows still counts as an active filter', async () => {
    const rows = [buildMembership({ id: 'm-1', userId: 'user-1' })]
    const { result } = renderViewModel({ memberships: rows, route: '/admin/memberships?user=user-999' })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.rows).toHaveLength(0)
    expect(result.current.isFilterActive).toBe(true)
  })

  // PO-WU-18, option (b) — the ONE new read this amendment introduces,
  // gated on the param's presence.
  it('PO-WU-18 — findById is called with the ?user= id, and its fullName backs filteredUserName', async () => {
    const rows = [buildMembership({ id: 'm-1', userId: 'user-1' })]
    const findById = vi.fn().mockResolvedValue(buildUser({ id: 'user-1', fullName: 'Compte Fraîchement Invité' }))
    const { result } = renderViewModel({ memberships: rows, findByIdImpl: findById, route: '/admin/memberships?user=user-1' })

    await waitFor(() => expect(result.current.filteredUserName).toBe('Compte Fraîchement Invité'))
    expect(findById).toHaveBeenCalledWith('user-1')
    expect(findById).toHaveBeenCalledTimes(1)
  })

  // §2.3b — one gesture: removes the URL param AND resets the three other
  // filters to their own default (never an invented "toutes les saisons").
  it('§2.3b — clearUserFilter removes the param and returns every filter to its default', async () => {
    const rows = [buildMembership({ id: 'm-1', userId: 'user-1' })]
    const { result } = renderViewModel({ memberships: rows, route: '/admin/memberships?user=user-1' })

    await waitFor(() => expect(result.current.userFilter).toBe('user-1'))

    act(() => result.current.setStatusFilter('pending'))
    expect(result.current.isFilterActive).toBe(true)

    act(() => result.current.clearUserFilter())

    await waitFor(() => expect(result.current.userFilter).toBeNull())
    expect(result.current.statusFilter).toBe('all')
    expect(result.current.cotisationFilter).toBe('all')
    expect(result.current.seasonFilter).toBe('season-1') // back to the current-season default
    expect(result.current.isFilterActive).toBe(false)
  })

  // AC-WU-59 — archiving a membership must now ALSO invalidate /admin/users'
  // own two keys, not just this screen's own.
  it('AC-WU-59 — archiving a membership invalidates usersAdminDirectory and usersBadgeCount too', async () => {
    const rows = [buildMembership({ id: 'm-1', userId: 'user-1' })]
    const { result, invalidateSpy } = renderViewModel({ memberships: rows })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.requestArchive(result.current.rows[0]))
    act(() => result.current.confirmArchive())

    await waitFor(() => expect(result.current.pendingArchive).toBeNull())

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey)
    expect(invalidatedKeys).toContainEqual(['users', 'admin', 'directory'])
    expect(invalidatedKeys).toContainEqual(['users', 'badge', 'count'])
  })
})
