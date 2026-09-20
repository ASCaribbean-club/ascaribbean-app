import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import type { MembershipAdminRow } from './useBackofficeMembershipsViewModel'
import { useMembershipEditRowViewModel } from './useMembershipEditRowViewModel'

// specs/web-users-membership-column.md §2.5/AC-WU-59 — the real new derived
// logic this amendment adds to this ViewModel (CLAUDE.md §8 carve-out): a
// successful update must now ALSO invalidate /admin/users' own two keys —
// the editable licence number can flip criterion 3 of its completeness
// read, not just criterion 2.

vi.mock('@presentation/di/hooks/use-memberships-dependencies')
vi.mock('@presentation/shared/hooks/use-auth')

const mockedUseMembershipsDependencies = vi.mocked(useMembershipsDependencies)
const mockedUseAuth = vi.mocked(useAuth)

function buildRow(): MembershipAdminRow {
  return {
    membership: { id: 'membership-1', userId: 'user-1', licenceNumber: 'FR-1', status: 'pending', seasonId: 'season-1', validUntil: '2027-06-30', amountDueCents: null },
    userFullName: 'Compte Un',
    seasonLabel: '2025-2026',
    seasonCotisationAmount: null,
    effectiveAmountDueCents: null,
    paidCents: 0,
    paymentStatus: 'unpaid',
  }
}

function renderViewModel({ updateMembership = vi.fn().mockResolvedValue(undefined) }: { updateMembership?: ReturnType<typeof vi.fn> } = {}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.test', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: new Date() },
    isLoading: false,
    refreshUser: vi.fn(),
  } as never)
  mockedUseMembershipsDependencies.mockReturnValue({
    paymentRepository: { listForMembership: vi.fn().mockResolvedValue([]) },
    updateMembershipUseCase: { execute: updateMembership },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const onSuccess = vi.fn()
  const rendered = renderHook(() => useMembershipEditRowViewModel({ row: buildRow(), onSuccess }), { wrapper })
  return { ...rendered, onSuccess, updateMembership, invalidateSpy }
}

describe('useMembershipEditRowViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // AC-WU-59 — a successful update now ALSO invalidates /admin/users' own
  // two keys, in addition to this screen's own membershipsAdminList/
  // membershipsBadgeCount.
  it('AC-WU-59 — a successful update invalidates usersAdminDirectory and usersBadgeCount too', async () => {
    const { result, invalidateSpy, onSuccess } = renderViewModel()
    await waitFor(() => expect(result.current.isLoadingHistory).toBe(false))

    act(() => result.current.submit())

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey)
    expect(invalidatedKeys).toContainEqual(['memberships', 'admin', 'list'])
    expect(invalidatedKeys).toContainEqual(['memberships', 'badge', 'count'])
    expect(invalidatedKeys).toContainEqual(['users', 'admin', 'directory'])
    expect(invalidatedKeys).toContainEqual(['users', 'badge', 'count'])
    // Payment history is untouched by this mutation (§1) — its own scoped
    // key must never be invalidated by it.
    expect(invalidatedKeys).not.toContainEqual(['memberships', 'membership-1', 'payments'])
  })
})
