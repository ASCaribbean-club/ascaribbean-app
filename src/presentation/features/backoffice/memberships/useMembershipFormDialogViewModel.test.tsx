import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useMembershipFormDialogViewModel } from './useMembershipFormDialogViewModel'

// specs/web-users-membership-column.md §2.5/AC-WU-59 — the real new derived
// logic this amendment adds to this ViewModel (CLAUDE.md §8 carve-out): a
// successful creation must now ALSO invalidate /admin/users' own two keys,
// the sense inverting from before this amendment. `presetUserId` is gone
// entirely (§2.6) — this hook only ever starts from an empty UTILISATEUR
// field now.

vi.mock('@presentation/di/hooks/use-memberships-dependencies')
vi.mock('@presentation/shared/hooks/use-auth')

const mockedUseMembershipsDependencies = vi.mocked(useMembershipsDependencies)
const mockedUseAuth = vi.mocked(useAuth)

function renderViewModel({ createMembership = vi.fn().mockResolvedValue(undefined) }: { createMembership?: ReturnType<typeof vi.fn> } = {}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.test', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: new Date() },
    isLoading: false,
    refreshUser: vi.fn(),
  } as never)
  mockedUseMembershipsDependencies.mockReturnValue({
    userRepository: { findAll: vi.fn().mockResolvedValue([{ id: 'user-1', fullName: 'Compte Un', email: 'compte-un@example.test' }]) },
    seasonRepository: { findAll: vi.fn().mockResolvedValue([{ id: 'season-1', label: '2025-2026', startDate: '2000-01-01', endDate: '2999-12-31', cotisationAmount: null }]) },
    createMembershipUseCase: { execute: createMembership },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const invalidateSpy = vi.spyOn(queryClient, 'invalidateQueries')
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const onSuccess = vi.fn()
  const rendered = renderHook(() => useMembershipFormDialogViewModel({ onSuccess }), { wrapper })
  return { ...rendered, onSuccess, createMembership, invalidateSpy }
}

describe('useMembershipFormDialogViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // §2.6 — no presetUserId parameter exists any more: the UTILISATEUR field
  // always starts empty, never pre-linked.
  it('§2.6 — starts with an empty userId, no pre-selection', async () => {
    const { result } = renderViewModel()
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    expect(result.current.values.userId).toBe('')
  })

  // AC-WU-59 — a successful creation now ALSO invalidates /admin/users' own
  // two keys, in addition to this screen's own membershipsAdminList/
  // membershipsBadgeCount.
  it('AC-WU-59 — a successful creation invalidates usersAdminDirectory and usersBadgeCount too', async () => {
    const { result, invalidateSpy, onSuccess } = renderViewModel()
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.setUserId('user-1'))
    act(() => result.current.setSeasonId('season-1'))
    act(() => result.current.setStatus('active'))
    act(() => result.current.setValidUntil('2027-06-30'))

    act(() => result.current.submit())

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey)
    expect(invalidatedKeys).toContainEqual(['memberships', 'admin', 'list'])
    expect(invalidatedKeys).toContainEqual(['memberships', 'badge', 'count'])
    expect(invalidatedKeys).toContainEqual(['users', 'admin', 'directory'])
    expect(invalidatedKeys).toContainEqual(['users', 'badge', 'count'])
  })
})
