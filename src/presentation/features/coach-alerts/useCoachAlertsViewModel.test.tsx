import { act } from 'react'
import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Convocation } from '@domain/entities/convocation'
import type { CoachAlertItem } from '@domain/usecases/coach-alerts/ListCoachAlertsUseCase'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useActiveTeam } from '@presentation/shared/hooks/use-active-team'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useCoachAlertsDependencies } from '@presentation/di/hooks/use-coach-alerts-dependencies'
import { useCoachDashboardDependencies } from '@presentation/di/hooks/use-coach-dashboard-dependencies'
import { useCoachAlertsViewModel } from './useCoachAlertsViewModel'

// This ViewModel's own derived logic (CLAUDE.md §8 carve-out for
// presentation tests) — everything else here is DI/RBAC wiring already
// covered by usePermission/ListCoachAlertsUseCase's own unit tests. Focus:
// the isEmpty/isFilteredEmpty/totalCount/countByType split (specs/
// coach-alerts.md's dated 2026-09-30 addenda), which is real derived state,
// not glue — a wrong split here renders a silently-misleading empty state.

vi.mock('@presentation/shared/hooks/use-auth')
vi.mock('@presentation/shared/hooks/use-active-role')
vi.mock('@presentation/shared/hooks/use-active-team')
vi.mock('@presentation/shared/hooks/use-permission')
vi.mock('@presentation/di/hooks/use-coach-alerts-dependencies')
vi.mock('@presentation/di/hooks/use-coach-dashboard-dependencies')

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseActiveRole = vi.mocked(useActiveRole)
const mockedUseActiveTeam = vi.mocked(useActiveTeam)
const mockedUsePermission = vi.mocked(usePermission)
const mockedUseCoachAlertsDependencies = vi.mocked(useCoachAlertsDependencies)
const mockedUseCoachDashboardDependencies = vi.mocked(useCoachDashboardDependencies)

const USER_ID = 'user-1'
const TEAM_ID = 'team-1'

function buildConvocation(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: TEAM_ID,
    type: 'training',
    date: '2026-08-01T18:00:00.000Z',
    location: 'Stade',
    trainingLocation: null,
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    createdAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

function buildAlertItem(overrides: Partial<CoachAlertItem> & { convocation: Convocation }): CoachAlertItem {
  return {
    matchDetails: null,
    opponent: null,
    attributedGoalCount: 0,
    attendanceConfirmationMissing: true,
    matchScoreMissing: false,
    goalAttributionMissing: false,
    ...overrides,
  }
}

function renderViewModel(alerts: CoachAlertItem[]) {
  mockedUseAuth.mockReturnValue({
    user: { id: USER_ID, fullName: 'Test Coach', email: 'c@test.fr', roles: [{ role: 'coach', teamIds: [TEAM_ID] }], position: null, age: null, handedness: null, charterAcceptedAt: null },
    isLoading: false,
    refreshUser: vi.fn(),
  })
  mockedUseActiveRole.mockReturnValue({ activeRole: 'coach', dashboardRoles: [],
    setActiveRole: vi.fn(),
    toggleActiveRole: vi.fn(), isOfficerView: false, isTreasurerView: false, hasMultipleDashboardRoles: false })
  mockedUseActiveTeam.mockReturnValue({ selectedCoachTeamId: TEAM_ID, selectCoachTeam: vi.fn() })
  mockedUsePermission.mockReturnValue(true)
  mockedUseCoachAlertsDependencies.mockReturnValue({
    listCoachAlertsUseCase: { execute: vi.fn().mockResolvedValue(alerts) },
  } as never)
  mockedUseCoachDashboardDependencies.mockReturnValue({
    getCoachTeamsUseCase: {
      execute: vi.fn().mockResolvedValue([{ team: { id: TEAM_ID, name: 'Équipe 1', sectionId: 'section-1', seasonId: 'season-1' }, activeMemberCount: 12 }]),
    },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  return renderHook(() => useCoachAlertsViewModel(), { wrapper })
}

describe('useCoachAlertsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('isEmpty is true and isFilteredEmpty is false when there is genuinely no alert', async () => {
    const { result } = renderViewModel([])

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isEmpty).toBe(true)
    expect(result.current.isFilteredEmpty).toBe(false)
    expect(result.current.totalCount).toBe(0)
    expect(result.current.items).toEqual([])
  })

  it('isEmpty stays false and totalCount stays unfiltered once alerts exist', async () => {
    const alerts = [
      buildAlertItem({ convocation: buildConvocation({ id: 'c1', type: 'training' }) }),
      buildAlertItem({ convocation: buildConvocation({ id: 'c2', type: 'match' }), matchScoreMissing: true, attendanceConfirmationMissing: false }),
    ]
    const { result } = renderViewModel(alerts)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isEmpty).toBe(false)
    expect(result.current.isFilteredEmpty).toBe(false)
    expect(result.current.totalCount).toBe(2)
    expect(result.current.items).toHaveLength(2)
  })

  it('countByType tallies the unfiltered backlog per convocation type', async () => {
    const alerts = [
      buildAlertItem({ convocation: buildConvocation({ id: 'c1', type: 'training' }) }),
      buildAlertItem({ convocation: buildConvocation({ id: 'c2', type: 'training' }) }),
      buildAlertItem({ convocation: buildConvocation({ id: 'c3', type: 'match' }), matchScoreMissing: true, attendanceConfirmationMissing: false }),
    ]
    const { result } = renderViewModel(alerts)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.countByType).toEqual({ training: 2, match: 1, meeting: 0 })
  })

  it('toggling a type filters items but leaves totalCount/countByType/isEmpty unaffected', async () => {
    const alerts = [
      buildAlertItem({ convocation: buildConvocation({ id: 'c1', type: 'training' }) }),
      buildAlertItem({ convocation: buildConvocation({ id: 'c2', type: 'match' }), matchScoreMissing: true, attendanceConfirmationMissing: false }),
    ]
    const { result } = renderViewModel(alerts)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.onToggleType('match'))

    expect(result.current.selectedTypes).toEqual(['match'])
    expect(result.current.items).toHaveLength(1)
    expect(result.current.items[0]?.convocation.id).toBe('c2')
    // Unaffected by the local filter — same convention as the page title.
    expect(result.current.totalCount).toBe(2)
    expect(result.current.countByType).toEqual({ training: 1, match: 1, meeting: 0 })
    expect(result.current.isEmpty).toBe(false)
    expect(result.current.isFilteredEmpty).toBe(false)

    // Toggling the same type back off restores the unfiltered list.
    act(() => result.current.onToggleType('match'))
    expect(result.current.selectedTypes).toEqual([])
    expect(result.current.items).toHaveLength(2)
  })

  it('isFilteredEmpty is true when a real backlog exists but the active filter matches nothing — isEmpty stays false', async () => {
    const alerts = [buildAlertItem({ convocation: buildConvocation({ id: 'c1', type: 'training' }) })]
    const { result } = renderViewModel(alerts)

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    act(() => result.current.onToggleType('match'))

    expect(result.current.items).toEqual([])
    expect(result.current.isFilteredEmpty).toBe(true)
    expect(result.current.isEmpty).toBe(false)
  })
})
