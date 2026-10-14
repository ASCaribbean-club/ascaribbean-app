import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationResponse, ConvocationStatus } from '@domain/entities/convocation'
import type { ConvocationForPlayer } from '@/domain/usecases/player-dashboard/ListUConvocationsForPlayerUseCase'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { usePlayerDashboardDependencies } from '@presentation/di/hooks/use-player-dashboard-dependencies'
import { useObservability } from '@presentation/di/hooks/use-observability'
import { DomainError } from '@domain/errors/domain-error'
import type { Observability } from '@presentation/shared/observability/observability'
import { usePlayerDashboardViewModel } from './usePlayerDashboardViewModel'

// AC-PD-06's canRespond combination and the next/upcoming split are the two
// pieces of real logic living in this ViewModel (CLAUDE.md §8 carve-out for
// presentation tests) — everything else here is DI/context wiring already
// covered by usePermission/response-deadline's own unit tests.

vi.mock('@presentation/shared/hooks/use-auth')
vi.mock('@presentation/shared/hooks/use-active-role')
vi.mock('@presentation/shared/hooks/use-permission')
vi.mock('@presentation/di/hooks/use-player-dashboard-dependencies')
vi.mock('@presentation/di/hooks/use-observability')

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseActiveRole = vi.mocked(useActiveRole)
const mockedUsePermission = vi.mocked(usePermission)
const mockedUsePlayerDashboardDependencies = vi.mocked(usePlayerDashboardDependencies)
const mockedUseObservability = vi.mocked(useObservability)

class RuleRefusedError extends DomainError {}

const observability: Observability = {
  track: vi.fn(),
  reportError: vi.fn(),
  enableAnalytics: vi.fn(),
  identify: vi.fn(),
  setActiveRole: vi.fn(),
  reset: vi.fn(),
}

const USER_ID = 'user-1'
const TEAM_ID = 'team-1'

function buildConvocation(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: 'convocation-1',
    teamId: TEAM_ID,
    type: 'training',
    date: '2026-08-27T18:00:00.000Z',
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

function buildUpcoming(convocation: Convocation, myResponse: ConvocationResponse | null = null): ConvocationForPlayer {
  return { convocation, myResponse, responseCounts: { present: 0, absent: 0, pending: 0 }, isConvoked: true, matchDetails: null, opponent: null, meetingDetails: null }
}

function renderViewModel(upcoming: ConvocationForPlayer[], respondOutcome: () => Promise<undefined> = () => Promise.resolve(undefined)) {
  mockedUseObservability.mockReturnValue(observability)
  mockedUseAuth.mockReturnValue({
    user: { id: USER_ID, fullName: 'Test Player', email: 't@test.fr', roles: [{ role: 'player', teamId: TEAM_ID }], position: null, age: null, handedness: null, charterAcceptedAt: null },
    isLoading: false,
    refreshUser: vi.fn(),
  })
  mockedUseActiveRole.mockReturnValue({ activeRole: 'player', dashboardRoles: [],
    setActiveRole: vi.fn(),
    toggleActiveRole: vi.fn(), isOfficerView: false, isTreasurerView: false, hasMultipleDashboardRoles: false })
  const respondToConvocationUseCase = { execute: vi.fn().mockImplementation(respondOutcome) }
  mockedUsePlayerDashboardDependencies.mockReturnValue({
    getPlayerTeamUseCase: { execute: vi.fn().mockResolvedValue({ id: TEAM_ID, name: 'Équipe 1' }) },
    listUpcomingConvocationsForPlayerUseCase: { execute: vi.fn().mockResolvedValue(upcoming) },
    respondToConvocationUseCase,
    listUserMissingOrRejectedDocumentsUseCase: { execute: vi.fn().mockResolvedValue([]) },
    getTeamRecentFormUseCase: { execute: vi.fn().mockResolvedValue({ form: [], goalsFor: 0, goalsAgainst: 0 }) },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter>{children}</MemoryRouter>
    </QueryClientProvider>
  )
  return { ...renderHook(() => usePlayerDashboardViewModel(), { wrapper }), respondToConvocationUseCase }
}

describe('usePlayerDashboardViewModel', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it('splits the soonest convocation into nextConvocation and keeps the rest in upcomingList', async () => {
    const soonest = buildUpcoming(buildConvocation({ id: 'soonest' }))
    const later = buildUpcoming(buildConvocation({ id: 'later' }))
    const { result } = renderViewModel([soonest, later])

    await waitFor(() => expect(result.current.nextConvocation).toBeDefined())

    expect(result.current.nextConvocation).toBe(soonest)
    expect(result.current.upcomingList).toEqual([later])
  })

  it.each<[string, boolean, ConvocationStatus, number, boolean]>([
    ['RBAC denied', false, 'open', 30, false],
    ['past the deadline', true, 'open', -30, false],
    ['not open anymore', true, 'closed', 30, false],
    ['authorized, open, within the window', true, 'open', 30, true],
  ])('canRespond — %s', async (_label, rbac, status, minutesFromNow, expected) => {
    mockedUsePermission.mockReturnValue(rbac)
    const date = new Date(Date.now() + minutesFromNow * 60_000).toISOString()
    const upcoming = buildUpcoming(buildConvocation({ status, date }))
    const { result } = renderViewModel([upcoming])

    await waitFor(() => expect(result.current.nextConvocation).toBeDefined())

    expect(result.current.canRespond).toBe(expected)
  })

  it('canRespond stays false while there is no nextConvocation', async () => {
    mockedUsePermission.mockReturnValue(true)
    const { result } = renderViewModel([])

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.nextConvocation).toBeUndefined()
    expect(result.current.canRespond).toBe(false)
  })

  it('skips the upsert when re-tapping the button matching the already-recorded response', async () => {
    mockedUsePermission.mockReturnValue(true)
    const myResponse: ConvocationResponse = {
      id: 'response-1',
      convocationId: 'convocation-1',
      userId: USER_ID,
      status: 'absent',
      reason: null,
      respondedAt: '2026-08-27T12:00:00.000Z',
    }
    const upcoming = buildUpcoming(buildConvocation(), myResponse)
    const { result, respondToConvocationUseCase } = renderViewModel([upcoming])

    await waitFor(() => expect(result.current.nextConvocation).toBeDefined())

    result.current.onRespondAbsent()
    expect(respondToConvocationUseCase.execute).not.toHaveBeenCalled()

    result.current.onRespondPresent()
    await waitFor(() => expect(respondToConvocationUseCase.execute).toHaveBeenCalledTimes(1))
    expect(respondToConvocationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'present' }),
    )
  })

  describe('observability', () => {
    async function respondWith(outcome: () => Promise<undefined>) {
      mockedUsePermission.mockReturnValue(true)
      const date = new Date(Date.now() + 90 * 60_000).toISOString()
      const { result, respondToConvocationUseCase } = renderViewModel([buildUpcoming(buildConvocation({ date }))], outcome)
      await waitFor(() => expect(result.current.nextConvocation).toBeDefined())
      result.current.onRespondPresent()
      await waitFor(() => expect(respondToConvocationUseCase.execute).toHaveBeenCalledTimes(1))
    }

    it('tracks the response with the remaining notice on success', async () => {
      await respondWith(() => Promise.resolve(undefined))

      await waitFor(() => expect(observability.track).toHaveBeenCalledTimes(1))
      // training: deadline = start - 10 min, started in 90 min → ~80 min left
      expect(observability.track).toHaveBeenCalledWith({
        name: 'convocation_responded',
        props: {
          convocation_type: 'training',
          convocation_date: expect.stringMatching(/^\d{4}-\d{2}-\d{2}$/),
          status: 'present',
          minutes_before_deadline: expect.any(Number),
          origin: 'dashboard',
        },
      })
      const props = vi.mocked(observability.track).mock.calls[0][0].props as { minutes_before_deadline: number }
      expect(props.minutes_before_deadline).toBeGreaterThanOrEqual(79)
      expect(props.minutes_before_deadline).toBeLessThanOrEqual(80)
      expect(observability.reportError).not.toHaveBeenCalled()
    })

    it('tracks a DomainError as a product signal, not as an error', async () => {
      await respondWith(() => Promise.reject(new RuleRefusedError('closed')))

      await waitFor(() => expect(observability.track).toHaveBeenCalledTimes(1))
      expect(observability.track).toHaveBeenCalledWith({ name: 'convocation_response_rejected', props: expect.objectContaining({ error_class: 'RuleRefusedError', origin: 'dashboard', convocation_type: 'training' }) })
      expect(observability.reportError).not.toHaveBeenCalled()
    })

    it('reports a non-domain error', async () => {
      const failure = new TypeError('network down')
      await respondWith(() => Promise.reject(failure))

      await waitFor(() => expect(observability.reportError).toHaveBeenCalledTimes(1))
      expect(observability.reportError).toHaveBeenCalledWith(failure, { source: 'mutation', action: 'respond_to_convocation' })
      expect(observability.track).not.toHaveBeenCalled()
    })
  })
})
