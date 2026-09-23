import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { useMembershipsAndInvitationsAlert } from './useMembershipsAndInvitationsAlert'

// specs/web-dashboard.md §2.5/AC-WD-05 — N is the SAME
// CountMembershipsRequiringAttentionUseCase reading the "Adhésions" nav
// badge and the "ADHÉSIONS À RENOUVELER" card already use; M is the SAME
// usersAdminDirectory() 'invited' count the dashboard's own card subline
// reads.

vi.mock('@presentation/di/hooks/use-memberships-dependencies')
vi.mock('@presentation/di/hooks/use-users-dependencies')

const mockedUseMembershipsDependencies = vi.mocked(useMembershipsDependencies)
const mockedUseUsersDependencies = vi.mocked(useUsersDependencies)

function buildEntry(overrides: Partial<AdminUserDirectoryEntry> = {}): AdminUserDirectoryEntry {
  return {
    id: 'user-1',
    fullName: 'Compte Un',
    email: 'compte-un@example.test',
    charterAcceptedAt: null,
    roles: [],
    missingElementFacts: { hasRole: true, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: false },
    ...overrides,
  }
}

function renderAlert({ membershipsBadgeCount, entries }: { membershipsBadgeCount: number; entries: AdminUserDirectoryEntry[] }) {
  mockedUseMembershipsDependencies.mockReturnValue({
    countMembershipsRequiringAttentionUseCase: { execute: vi.fn().mockResolvedValue(membershipsBadgeCount) },
  } as never)
  mockedUseUsersDependencies.mockReturnValue({
    userRepository: { findAdminDirectory: vi.fn().mockResolvedValue(entries) },
    seasonRepository: { findCurrent: vi.fn().mockResolvedValue({ id: 'season-1', label: '2025-2026', startDate: '', endDate: '', cotisationAmount: null }) },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return renderHook(() => useMembershipsAndInvitationsAlert(), { wrapper })
}

describe('useMembershipsAndInvitationsAlert', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('membershipsCount is exactly CountMembershipsRequiringAttentionUseCase.execute() — the same value the nav badge/card use', async () => {
    const { result } = renderAlert({ membershipsBadgeCount: 3, entries: [] })

    await waitFor(() => expect(result.current.membershipsCount).toBe(3))
  })

  it('invitationsCount counts only accounts with charterAcceptedAt === null, from the shared usersAdminDirectory read', async () => {
    const entries = [
      buildEntry({ id: 'u1', charterAcceptedAt: null }),
      buildEntry({ id: 'u2', charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z') }),
      buildEntry({ id: 'u3', charterAcceptedAt: null }),
    ]
    const { result } = renderAlert({ membershipsBadgeCount: 0, entries })

    await waitFor(() => expect(result.current.invitationsCount).toBe(2))
  })
})
