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

function renderViewModel({
  createMembership = vi.fn().mockResolvedValue(undefined),
  users = [{ id: 'user-1', fullName: 'Compte Un', email: 'compte-un@example.test' }],
  existingMemberships = [] as { userId: string; seasonId: string }[],
  currentSeasonId = null as string | null,
}: {
  createMembership?: ReturnType<typeof vi.fn>
  users?: { id: string; fullName: string; email: string }[]
  existingMemberships?: { userId: string; seasonId: string }[]
  currentSeasonId?: string | null
} = {}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.test', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: new Date() },
    isLoading: false,
    refreshUser: vi.fn(),
  } as never)
  mockedUseMembershipsDependencies.mockReturnValue({
    userRepository: { findAll: vi.fn().mockResolvedValue(users) },
    seasonRepository: {
      findAll: vi.fn().mockResolvedValue([{ id: 'season-1', label: '2025-2026', startDate: '2000-01-01', endDate: '2999-12-31', cotisationAmount: null }]),
      // §2.6b/AC-WM-20 pattern — null unless a test explicitly opts in, so
      // existing tests keep exercising the "no default, explicit pick only"
      // path unchanged.
      findCurrent: vi
        .fn()
        .mockResolvedValue(currentSeasonId ? { id: currentSeasonId, label: '2025-2026', startDate: '2000-01-01', endDate: '2999-12-31', cotisationAmount: null } : null),
    },
    membershipRepository: {
      findAllForAdmin: vi.fn().mockResolvedValue(
        existingMemberships.map((m, index) => ({
          id: `membership-${index}`,
          userId: m.userId,
          seasonId: m.seasonId,
          licenceNumber: null,
          status: 'pending',
          validUntil: '2027-06-30',
          amountDueCents: null,
        })),
      ),
    },
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
    act(() => result.current.setValidUntil('2027-06-30'))

    act(() => result.current.submit())

    await waitFor(() => expect(onSuccess).toHaveBeenCalledTimes(1))

    const invalidatedKeys = invalidateSpy.mock.calls.map((call) => (call[0] as { queryKey: unknown[] }).queryKey)
    expect(invalidatedKeys).toContainEqual(['memberships', 'admin', 'list'])
    expect(invalidatedKeys).toContainEqual(['memberships', 'badge', 'count'])
    expect(invalidatedKeys).toContainEqual(['users', 'admin', 'directory'])
    expect(invalidatedKeys).toContainEqual(['users', 'badge', 'count'])
  })

  // Developer decision (2026-09-23) — the "Nouvelle adhésion" dialog no
  // longer carries a STATUT field: a brand-new membership always starts
  // 'pending', since CreateMembershipUseCase rejects 'active' outright for a
  // fresh membership (it can never have a settled cotisation yet).
  it('always creates with status "pending", with no status field to set', async () => {
    const createMembership = vi.fn().mockResolvedValue(undefined)
    const { result } = renderViewModel({ createMembership })
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    expect(result.current).not.toHaveProperty('setStatus')

    act(() => result.current.setUserId('user-1'))
    act(() => result.current.setSeasonId('season-1'))
    act(() => result.current.setValidUntil('2027-06-30'))
    act(() => result.current.submit())

    await waitFor(() => expect(createMembership).toHaveBeenCalledTimes(1))
    expect(createMembership).toHaveBeenCalledWith(expect.objectContaining({ status: 'pending' }))
  })

  // Developer decision (2026-09-23) — an admin must not be able to pick a
  // user who already holds a live membership for the selected season: the
  // DB's own partial unique index would reject that pair anyway
  // (DuplicateMembershipError), so the dropdown filters it out up front.
  it('excludes a user from the UTILISATEUR list once they already have a membership for the selected season', async () => {
    const users = [
      { id: 'user-1', fullName: 'Compte Un', email: 'compte-un@example.test' },
      { id: 'user-2', fullName: 'Compte Deux', email: 'compte-deux@example.test' },
    ]
    const { result } = renderViewModel({ users, existingMemberships: [{ userId: 'user-1', seasonId: 'season-1' }] })
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    // No season chosen yet — nothing to exclude against.
    expect(result.current.users.map((u) => u.id)).toEqual(['user-1', 'user-2'])

    act(() => result.current.setSeasonId('season-1'))
    expect(result.current.users.map((u) => u.id)).toEqual(['user-2'])
  })

  // Bug fix (2026-09-23) — without a default season, the exclusion above did
  // nothing in practice: UTILISATEUR is the form's FIRST field, so an admin
  // opening it before ever touching SAISON always saw every user, including
  // ones already holding a membership for what would become the selected
  // season. SAISON now defaults to the current season, so the exclusion
  // applies from the very first render.
  it('defaults SAISON to the current season, excluding users with a membership for it, before SAISON is ever touched', async () => {
    const users = [
      { id: 'user-1', fullName: 'Compte Un', email: 'compte-un@example.test' },
      { id: 'user-2', fullName: 'Compte Deux', email: 'compte-deux@example.test' },
    ]
    const { result } = renderViewModel({
      users,
      currentSeasonId: 'season-1',
      existingMemberships: [{ userId: 'user-1', seasonId: 'season-1' }],
    })
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    expect(result.current.values.seasonId).toBe('season-1')
    expect(result.current.users.map((u) => u.id)).toEqual(['user-2'])
  })

  // PO-WM-12 resolved (developer decision, 2026-09-23) — VALIDE JUSQU'AU
  // defaults to the selected season's own end date.
  it('defaults validUntil to the selected season’s end date', async () => {
    const { result } = renderViewModel()
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    expect(result.current.values.validUntil).toBe('')

    act(() => result.current.setSeasonId('season-1'))
    expect(result.current.values.validUntil).toBe('2999-12-31')
  })

  it('stops following the season default once the admin types their own validUntil', async () => {
    const { result } = renderViewModel()
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.setSeasonId('season-1'))
    act(() => result.current.setValidUntil('2027-01-15'))
    expect(result.current.values.validUntil).toBe('2027-01-15')
  })

  it('clears an already-picked user if a season change makes them unavailable', async () => {
    const users = [{ id: 'user-1', fullName: 'Compte Un', email: 'compte-un@example.test' }]
    const { result } = renderViewModel({ users, existingMemberships: [{ userId: 'user-1', seasonId: 'season-1' }] })
    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.setSeasonId('some-other-season'))
    act(() => result.current.setUserId('user-1'))
    expect(result.current.values.userId).toBe('user-1')

    act(() => result.current.setSeasonId('season-1'))
    expect(result.current.values.userId).toBe('')
  })
})
