import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useMembershipsDependencies } from '@presentation/di/hooks/use-memberships-dependencies'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useBackofficeOverviewViewModel } from './useBackofficeOverviewViewModel'

// specs/web-dashboard.md §2/§2.8 — the real derived logic this ViewModel
// adds (CLAUDE.md §8 carve-out for presentation tests): AC-WD-05 (the
// memberships card's own value IS CountMembershipsRequiringAttentionUseCase's
// return value, never a second definition), AC-WD-06 (no "actives" wording
// simulated for Sections), AC-WD-07 (the "no current season" repli, on
// three different blocks at once), AC-WD-15 (ONE usersAdminDirectory read
// backs both the "UTILISATEURS ACTIFS" card AND the pending-invitations
// panel), and the two panels' own 5-row cap with an overflow count
// (PO-WD-02's retained default).

vi.mock('@presentation/di/hooks/use-users-dependencies')
vi.mock('@presentation/di/hooks/use-section-and-teams-dependencies')
vi.mock('@presentation/di/hooks/use-memberships-dependencies')
vi.mock('@presentation/shared/hooks/use-auth')
vi.mock('@presentation/shared/hooks/use-permission')

const mockedUseUsersDependencies = vi.mocked(useUsersDependencies)
const mockedUseSectionAndTeamsDependencies = vi.mocked(useSectionAndTeamsDependencies)
const mockedUseMembershipsDependencies = vi.mocked(useMembershipsDependencies)
const mockedUseAuth = vi.mocked(useAuth)
const mockedUsePermission = vi.mocked(usePermission)

function buildEntry(overrides: Partial<AdminUserDirectoryEntry> = {}): AdminUserDirectoryEntry {
  return {
    id: 'user-1',
    fullName: 'Compte Un',
    email: 'compte-un@example.test',
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    roles: [{ role: 'player', teamId: 'team-1' }],
    missingElementFacts: { hasRole: true, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: true },
    ...overrides,
  }
}

const CURRENT_SEASON = { id: 'season-1', label: '2025-2026' as const, startDate: '2025-08-01', endDate: '2026-07-31', cotisationAmount: null }

function renderViewModel({
  entries = [],
  membershipsBadgeCount = 0,
  sectionsCount = 0,
  teamsCount = 0,
  seasonsCount = 0,
  currentSeason = CURRENT_SEASON as typeof CURRENT_SEASON | null,
  memberships = [],
  payments = [],
  usersSummary = [],
}: {
  entries?: AdminUserDirectoryEntry[]
  membershipsBadgeCount?: number
  sectionsCount?: number
  teamsCount?: number
  seasonsCount?: number
  currentSeason?: typeof CURRENT_SEASON | null
  memberships?: Array<{ id: string; userId: string; licenceNumber: string | null; status: string; seasonId: string; validUntil: string; amountDueCents: number | null }>
  payments?: Array<{ id: string; membershipId: string; amountCents: number; paidAt: string; recordedBy: string; recordedAt: string }>
  usersSummary?: Array<{ id: string; fullName: string; email: string }>
}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'admin-1', fullName: 'Administrateur Un', email: 'admin@example.test', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: new Date() },
    isLoading: false,
    refreshUser: vi.fn(),
  } as never)
  mockedUsePermission.mockReturnValue(true)

  mockedUseUsersDependencies.mockReturnValue({
    userRepository: { findAdminDirectory: vi.fn().mockResolvedValue(entries) },
  } as never)

  const sections = Array.from({ length: sectionsCount }).map((_, index) => ({ id: `section-${index}`, name: `Section ${index}`, type: 'football' }))
  const teams = Array.from({ length: teamsCount }).map((_, index) => ({ id: `team-${index}` }))
  mockedUseSectionAndTeamsDependencies.mockReturnValue({
    sectionRepository: { findAll: vi.fn().mockResolvedValue(sections) },
    teamRepository: { findAllForAdmin: vi.fn().mockResolvedValue(teams) },
  } as never)

  const seasons = Array.from({ length: seasonsCount }).map((_, index) => ({ id: `season-x-${index}`, label: `202${index}-202${index + 1}`, startDate: '', endDate: '', cotisationAmount: null }))

  mockedUseMembershipsDependencies.mockReturnValue({
    membershipRepository: { findAllForAdmin: vi.fn().mockResolvedValue(memberships) },
    paymentRepository: { findAllForAdmin: vi.fn().mockResolvedValue(payments) },
    userRepository: { findAll: vi.fn().mockResolvedValue(usersSummary) },
    seasonRepository: {
      findCurrent: vi.fn().mockResolvedValue(currentSeason),
      findAll: vi.fn().mockResolvedValue(seasons),
    },
    countMembershipsRequiringAttentionUseCase: { execute: vi.fn().mockResolvedValue(membershipsBadgeCount) },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  return renderHook(() => useBackofficeOverviewViewModel(), { wrapper })
}

describe('useBackofficeOverviewViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('AC-WD-05 — the memberships card value is exactly CountMembershipsRequiringAttentionUseCase.execute()', async () => {
    const { result } = renderViewModel({ membershipsBadgeCount: 7 })

    await waitFor(() => expect(result.current.statCards.find((card) => card.id === 'memberships')?.isLoading).toBe(false))

    const card = result.current.statCards.find((card) => card.id === 'memberships')!
    expect(card.value).toBe(7)
    expect(card.subline).toBe('Statut « en attente »')
  })

  it('AC-WD-06 — the Sections card label never carries the mockup\'s own "actives" wording', async () => {
    const { result } = renderViewModel({ sectionsCount: 3, teamsCount: 5 })

    await waitFor(() => expect(result.current.statCards.find((card) => card.id === 'sections')?.isLoading).toBe(false))

    const card = result.current.statCards.find((card) => card.id === 'sections')!
    expect(card.label).toBe('Sections')
    expect(card.value).toBe(3)
    expect(card.subline).toBe('5 équipes au total')
  })

  it('AC-WD-07 — with no current season, Seasons shows an explicit fallback, Memberships shows 0, and the header context line drops the season segment', async () => {
    const { result } = renderViewModel({ currentSeason: null, sectionsCount: 2, membershipsBadgeCount: 0, seasonsCount: 4 })

    await waitFor(() => expect(result.current.statCards.find((card) => card.id === 'seasons')?.isLoading).toBe(false))

    const seasonsCard = result.current.statCards.find((card) => card.id === 'seasons')!
    expect(seasonsCard.subline).toBe('Aucune saison en cours')
    expect(seasonsCard.value).toBe(4)

    const membershipsCard = result.current.statCards.find((card) => card.id === 'memberships')!
    expect(membershipsCard.value).toBe(0)

    await waitFor(() => expect(result.current.contextLine).not.toBeNull())
    expect(result.current.contextLine).toBe('2 sections · club invitation-only')
  })

  it('AC-WD-07 — with a current season, the header context line includes the season segment', async () => {
    const { result } = renderViewModel({ currentSeason: CURRENT_SEASON, sectionsCount: 1 })

    await waitFor(() => expect(result.current.contextLine).not.toBeNull())
    expect(result.current.contextLine).toBe('Saison 2025-2026 · 1 section · club invitation-only')
  })

  it('AC-WD-15 — the "UTILISATEURS ACTIFS" card and the pending-invitations panel both come from the SAME usersAdminDirectory read', async () => {
    const entries = [
      buildEntry({ id: 'u1', charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z') }), // active
      buildEntry({ id: 'u2', charterAcceptedAt: null }), // invited
      buildEntry({ id: 'u3', charterAcceptedAt: null }), // invited
    ]
    const { result } = renderViewModel({ entries })

    await waitFor(() => expect(result.current.pendingInvitations.isLoading).toBe(false))

    const usersCard = result.current.statCards.find((card) => card.id === 'users')!
    expect(usersCard.value).toBe(1)
    expect(usersCard.subline).toBe('2 invitations en attente')
    expect(result.current.pendingInvitations.rows.map((entry) => entry.id)).toEqual(['u2', 'u3'])
    expect(result.current.pendingInvitations.totalCount).toBe(2)
  })

  it('caps the pending-invitations panel at 5 rows and reports the overflow count', async () => {
    const entries = Array.from({ length: 7 }).map((_, index) => buildEntry({ id: `invited-${index}`, charterAcceptedAt: null }))
    const { result } = renderViewModel({ entries })

    await waitFor(() => expect(result.current.pendingInvitations.isLoading).toBe(false))

    expect(result.current.pendingInvitations.rows).toHaveLength(5)
    expect(result.current.pendingInvitations.remainingCount).toBe(2)
    expect(result.current.pendingInvitations.totalCount).toBe(7)
  })

  it('AC-WD-14 — the unpaid-dues panel is scoped to the current season only, excluding a fully-paid or other-season membership', async () => {
    const memberships = [
      { id: 'm-current-unpaid', userId: 'user-1', licenceNumber: null, status: 'pending', seasonId: 'season-1', validUntil: '2027-06-30', amountDueCents: 10000 },
      { id: 'm-current-paid', userId: 'user-2', licenceNumber: null, status: 'active', seasonId: 'season-1', validUntil: '2027-06-30', amountDueCents: 10000 },
      { id: 'm-other-season', userId: 'user-3', licenceNumber: null, status: 'pending', seasonId: 'season-other', validUntil: '2027-06-30', amountDueCents: 10000 },
    ]
    const payments = [{ id: 'p1', membershipId: 'm-current-paid', amountCents: 10000, paidAt: '2026-01-01', recordedBy: 'admin-1', recordedAt: '2026-01-01T00:00:00.000Z' }]
    const usersSummary = [
      { id: 'user-1', fullName: 'Compte Un', email: 'compte-un@example.test' },
      { id: 'user-2', fullName: 'Compte Deux', email: 'compte-deux@example.test' },
      { id: 'user-3', fullName: 'Compte Trois', email: 'compte-trois@example.test' },
    ]
    const { result } = renderViewModel({ memberships, payments, usersSummary })

    await waitFor(() => expect(result.current.unpaidDues.isLoading).toBe(false))

    expect(result.current.unpaidDues.rows.map((row) => row.membership.id)).toEqual(['m-current-unpaid'])
    expect(result.current.unpaidDues.totalRemainingCents).toBe(10000)
  })

  it('AC-WD-14/AC-WD-07 — with no current season, the unpaid-dues panel is empty rather than showing every season', async () => {
    const memberships = [{ id: 'm-1', userId: 'user-1', licenceNumber: null, status: 'pending', seasonId: 'season-1', validUntil: '2027-06-30', amountDueCents: 10000 }]
    const { result } = renderViewModel({ memberships, currentSeason: null })

    await waitFor(() => expect(result.current.unpaidDues.isLoading).toBe(false))

    expect(result.current.unpaidDues.rows).toHaveLength(0)
    expect(result.current.unpaidDues.totalCount).toBe(0)
  })
})
