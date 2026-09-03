import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationResponse, ConvocationStatus } from '@domain/entities/convocation'
import type { ActiveDashboardRole } from '@domain/rules/active-role-scope'
import type { ConvocationResponderStatus } from '@domain/repositories/convocation-responders-repository'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'
import { useConvocationDetailViewModel } from './useConvocationDetailViewModel'

// canRespond's RBAC/deadline/activeRole combination, playerResponse's
// derivation from playerResponseQuery, the duplicate-upsert guards, and the
// `others` self-exclusion filter are the real logic living in this
// ViewModel (CLAUDE.md §8 carve-out) — everything else is DI/context wiring.

vi.mock('@presentation/shared/hooks/use-auth')
vi.mock('@presentation/shared/hooks/use-active-role')
vi.mock('@presentation/shared/hooks/use-permission')
vi.mock('@presentation/di/hooks/use-convocation-dependencies')

const mockedUseAuth = vi.mocked(useAuth)
const mockedUseActiveRole = vi.mocked(useActiveRole)
const mockedUsePermission = vi.mocked(usePermission)
const mockedUseConvocationDependencies = vi.mocked(useConvocationDependencies)

const USER_ID = 'user-1'
const TEAM_ID = 'team-1'
const CONVOCATION_ID = 'convocation-1'

function buildConvocation(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: CONVOCATION_ID,
    teamId: TEAM_ID,
    type: 'training',
    date: '2026-08-27T18:00:00.000Z',
    location: 'Stade',
    status: 'open',
    closedAt: null,
    closedBy: null,
    cancelledAt: null,
    cancelledBy: null,
    cancellationReason: null,
    createdBy: 'coach-1',
    ...overrides,
  }
}

function buildResponse(overrides: Partial<ConvocationResponse> = {}): ConvocationResponse {
  return {
    id: 'response-1',
    convocationId: CONVOCATION_ID,
    userId: USER_ID,
    status: 'absent',
    reason: null,
    respondedAt: '2026-08-27T12:00:00.000Z',
    ...overrides,
  }
}

function renderViewModel(options: {
  convocation?: Convocation | null
  activeRole?: ActiveDashboardRole
  playerResponse?: ConvocationResponse | null
  responders?: ConvocationResponderStatus[]
}) {
  const convocation = options.convocation === undefined ? buildConvocation() : options.convocation

  mockedUseAuth.mockReturnValue({
    user: { id: USER_ID, fullName: 'Test Player', email: 't@test.fr', roles: [{ role: 'player', teamId: TEAM_ID }, { role: 'coach', teamIds: [TEAM_ID] }], position: null, charterAcceptedAt: null },
    isLoading: false,
    refreshUser: vi.fn(),
  })
  mockedUseActiveRole.mockReturnValue({ activeRole: options.activeRole ?? 'player', toggleActiveRole: vi.fn() })

  const respondToConvocationUseCase = { execute: vi.fn().mockResolvedValue(undefined) }
  const listConvocationRespondersUseCase = { execute: vi.fn().mockResolvedValue(options.responders ?? []) }
  const getConvocationRosterForCoachUseCase = { execute: vi.fn().mockResolvedValue({ roster: [], responseCounts: { present: 0, absent: 0, pending: 0 } }) }
  const getConvocationResponseByUserUseCase = { execute: vi.fn().mockResolvedValue(options.playerResponse ?? null) }
  mockedUseConvocationDependencies.mockReturnValue({
    teamRepository: { findById: vi.fn().mockResolvedValue({ id: TEAM_ID, name: 'Équipe 1', sectionId: 'section-1', seasonId: 'season-1' }) },
    getConvocationWithDetailsUseCase: { execute: vi.fn().mockResolvedValue(convocation ? { convocation, matchDetails: null, opponent: null, meetingDetails: null } : null) },
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    getConvocationResponseByUserUseCase,
    respondToConvocationUseCase,
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[`/convocations/${CONVOCATION_ID}`]}>
        <Routes>
          <Route path="/convocations/:id" element={children} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  )
  return {
    ...renderHook(() => useConvocationDetailViewModel(), { wrapper }),
    respondToConvocationUseCase,
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    getConvocationResponseByUserUseCase,
  }
}

describe('useConvocationDetailViewModel', () => {
  beforeEach(() => {
    vi.useRealTimers()
    vi.clearAllMocks()
  })

  it.each<[string, ActiveDashboardRole, boolean, ConvocationStatus, number, boolean]>([
    ['coach never responds', 'coach', true, 'open', 30, false],
    ['RBAC denied', 'player', false, 'open', 30, false],
    ['past the deadline', 'player', true, 'open', -30, false],
    ['not open anymore', 'player', true, 'closed', 30, false],
    ['authorized, open, within the window', 'player', true, 'open', 30, true],
  ])('canRespond — %s', async (_label, activeRole, rbac, status, minutesFromNow, expected) => {
    mockedUsePermission.mockReturnValue(rbac)
    const date = new Date(Date.now() + minutesFromNow * 60_000).toISOString()
    const { result } = renderViewModel({ convocation: buildConvocation({ status, date }), activeRole })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canRespond).toBe(expected)
  })

  it('derives playerResponse from the player\'s own ConvocationResponse, never a boolean-only responder entry (AC-MD-07)', async () => {
    const { result } = renderViewModel({ playerResponse: buildResponse({ status: 'present' }) })
    act(() => result.current.setActiveTab('effectif'))

    await waitFor(() => expect(result.current.playerResponse).toBe('present'))
  })

  it('playerResponse stays null when the player has not responded yet', async () => {
    const { result } = renderViewModel({ playerResponse: null })
    act(() => result.current.setActiveTab('effectif'))

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.playerResponse).toBeNull()
  })

  it('skips the upsert when re-tapping the button matching the already-recorded response', async () => {
    mockedUsePermission.mockReturnValue(true)
    const { result, respondToConvocationUseCase } = renderViewModel({
      convocation: buildConvocation({ status: 'open' }),
      playerResponse: buildResponse({ status: 'absent' }),
    })
    act(() => result.current.setActiveTab('effectif'))

    await waitFor(() => expect(result.current.playerResponse).toBe('absent'))

    result.current.onRespondAbsent()
    expect(respondToConvocationUseCase.execute).not.toHaveBeenCalled()

    result.current.onRespondPresent()
    await waitFor(() => expect(respondToConvocationUseCase.execute).toHaveBeenCalledTimes(1))
    expect(respondToConvocationUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ status: 'present' }),
    )
  })

  it('excludes the current user from `others`, leaving their row to SelfRosterRow', async () => {
    const responders: ConvocationResponderStatus[] = [
      { userId: USER_ID, hasResponded: true, displayName: 'Moi', position: null },
      { userId: 'user-2', hasResponded: false, displayName: 'Autre Joueur', position: null },
    ]
    const { result } = renderViewModel({ responders })
    act(() => result.current.setActiveTab('effectif'))

    await waitFor(() => expect(result.current.others).toHaveLength(1))

    expect(result.current.others[0].userId).toBe('user-2')
  })

  it('reports notFound when the convocation is null (AC-MD-01)', async () => {
    const { result } = renderViewModel({ convocation: null })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.notFound).toBe(true)
  })

  it.each<[string, ActiveDashboardRole, string, boolean]>([
    ['matching player team', 'player', TEAM_ID, true],
    ['non-matching player team', 'player', 'other-team', false],
    ['matching coach team', 'coach', TEAM_ID, true],
  ])('roleMatchesConvocationTeam — %s', async (_label, activeRole, convocationTeamId, expected) => {
    const { result } = renderViewModel({ convocation: buildConvocation({ teamId: convocationTeamId }), activeRole })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.roleMatchesConvocationTeam).toBe(expected)
  })

  // AC-MD-08's own lesson (docs/convocation_visibility_rls_correction.md
  // §5.5) generalizes here: hiding coach-only/player-only data in the
  // returned shape isn't enough to prove the wrong query never ran — assert
  // the use case itself was never invoked, not just that its result is
  // absent from the ViewModel's output.
  it('never invokes the coach-roster or player-responders/self-response use cases when the active role is player', async () => {
    const { result, getConvocationRosterForCoachUseCase, listConvocationRespondersUseCase, getConvocationResponseByUserUseCase } = renderViewModel({ activeRole: 'player' })
    act(() => result.current.setActiveTab('effectif'))

    await waitFor(() => expect(listConvocationRespondersUseCase.execute).toHaveBeenCalled())

    expect(getConvocationResponseByUserUseCase.execute).toHaveBeenCalled()
    expect(getConvocationRosterForCoachUseCase.execute).not.toHaveBeenCalled()
  })

  it('never invokes the player-responders or self-response use cases when the active role is coach', async () => {
    const { result, getConvocationRosterForCoachUseCase, listConvocationRespondersUseCase, getConvocationResponseByUserUseCase } = renderViewModel({ activeRole: 'coach' })
    act(() => result.current.setActiveTab('effectif'))

    await waitFor(() => expect(getConvocationRosterForCoachUseCase.execute).toHaveBeenCalled())

    expect(listConvocationRespondersUseCase.execute).not.toHaveBeenCalled()
    expect(getConvocationResponseByUserUseCase.execute).not.toHaveBeenCalled()
  })

  // The efficiency fix this test guards: the Effectif-tab-only queries used
  // to be gated on activeRole alone, so they fired on mount even while the
  // (default) Infos tab was showing — three network round trips for data
  // nothing on screen needed yet.
  it('does not invoke any Effectif-tab use case while the default Infos tab is active', async () => {
    const { result, getConvocationRosterForCoachUseCase, listConvocationRespondersUseCase, getConvocationResponseByUserUseCase } = renderViewModel({ activeRole: 'player' })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(listConvocationRespondersUseCase.execute).not.toHaveBeenCalled()
    expect(getConvocationResponseByUserUseCase.execute).not.toHaveBeenCalled()
    expect(getConvocationRosterForCoachUseCase.execute).not.toHaveBeenCalled()
  })
})
