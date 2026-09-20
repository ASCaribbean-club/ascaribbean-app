import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useBackofficeUsersViewModel } from './useBackofficeUsersViewModel'

// specs/web-users.md AC-WU-19/AC-WU-23 — the two pieces of real derived
// logic in this ViewModel (CLAUDE.md §8 carve-out for presentation tests):
// the search+role+status filters must combine (never one excluding the
// others silently), and the four write booleans must stay independently
// computed, never collapsed into one canManageUsers.

vi.mock('@presentation/di/hooks/use-users-dependencies')
vi.mock('@presentation/shared/hooks/use-permission')

const mockedUseUsersDependencies = vi.mocked(useUsersDependencies)
const mockedUsePermission = vi.mocked(usePermission)

function buildEntry(overrides: Partial<AdminUserDirectoryEntry> = {}): AdminUserDirectoryEntry {
  return {
    id: 'user-1',
    fullName: 'Joueur Un',
    email: 'joueur-un@example.test',
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    roles: [{ role: 'player', teamId: 'team-1' }],
    missingElementFacts: { hasRole: true, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: true },
    ...overrides,
  }
}

function renderViewModel({
  entries,
  permissions = {},
}: {
  entries: AdminUserDirectoryEntry[]
  permissions?: Partial<Record<'user:invite' | 'user:write' | 'role:assign', boolean>>
}) {
  mockedUsePermission.mockImplementation((action) => permissions[action as keyof typeof permissions] ?? false)
  mockedUseUsersDependencies.mockReturnValue({
    userRepository: { findAdminDirectory: vi.fn().mockResolvedValue(entries) },
    teamRepository: { findAllForAdmin: vi.fn().mockResolvedValue([]) },
    sectionRepository: { findAll: vi.fn().mockResolvedValue([]) },
    seasonRepository: { findCurrent: vi.fn().mockResolvedValue({ id: 'season-1', label: '2025-2026', startDate: '2000-01-01', endDate: '2999-12-31', cotisationAmount: null }) },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  return renderHook(() => useBackofficeUsersViewModel(), { wrapper })
}

describe('useBackofficeUsersViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC-WU-23 — the search filter matches on name OR email, combined with the other filters', async () => {
    const player = buildEntry({ id: 'user-1', fullName: 'Joueur Un', email: 'joueur-un@example.test' })
    const coach = buildEntry({
      id: 'user-2',
      fullName: 'Coach Deux',
      email: 'coach-deux@example.test',
      roles: [{ role: 'coach', teamIds: ['team-1'] }],
    })
    const { result } = renderViewModel({ entries: [player, coach] })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows).toHaveLength(2)

    act(() => result.current.setSearch('coach-deux'))
    expect(result.current.rows.map((row) => row.id)).toEqual(['user-2'])

    act(() => result.current.setSearch('Joueur'))
    expect(result.current.rows.map((row) => row.id)).toEqual(['user-1'])

    act(() => result.current.setSearch(''))
    act(() => result.current.setRoleFilter('coach'))
    expect(result.current.rows.map((row) => row.id)).toEqual(['user-2'])
  })

  it('AC-WU-09 — the status filter matches the pure userStatus() predicate, not a stored value', async () => {
    const invited = buildEntry({ id: 'user-invited', charterAcceptedAt: null })
    const active = buildEntry({ id: 'user-active', charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z') })
    const { result } = renderViewModel({ entries: [invited, active] })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.setStatusFilter('invited'))
    expect(result.current.rows.map((row) => row.id)).toEqual(['user-invited'])

    act(() => result.current.setStatusFilter('active'))
    expect(result.current.rows.map((row) => row.id)).toEqual(['user-active'])
  })

  it('isFilterActive is true as soon as any of the three filters is touched', async () => {
    const { result } = renderViewModel({ entries: [buildEntry()] })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isFilterActive).toBe(false)

    act(() => result.current.setSearch('joueur'))
    expect(result.current.isFilterActive).toBe(true)

    act(() => result.current.setSearch(''))
    expect(result.current.isFilterActive).toBe(false)

    act(() => result.current.setRoleFilter('player'))
    expect(result.current.isFilterActive).toBe(true)
  })

  it('AC-WU-19/AC-WU-56 — the three write booleans are computed independently, never collapsed into one', async () => {
    const { result } = renderViewModel({
      entries: [],
      permissions: { 'user:invite': true, 'user:write': false, 'role:assign': true },
    })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canInviteUser).toBe(true)
    expect(result.current.canWriteUser).toBe(false)
    expect(result.current.canAssignRole).toBe(true)
    // AC-WU-56 — 'membership:write' is no longer a boolean this screen
    // computes at all: no `canWriteMembership` key exists on the ViewModel
    // any more.
    expect('canWriteMembership' in result.current).toBe(false)
  })

  it('specs/web-users-membership-column.md §2.3d/AC-WU-57 — exposes currentSeasonId for the ADHÉSION SAISON column, no second read', async () => {
    const { result } = renderViewModel({ entries: [buildEntry()] })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.currentSeasonId).toBe('season-1')
  })
})
