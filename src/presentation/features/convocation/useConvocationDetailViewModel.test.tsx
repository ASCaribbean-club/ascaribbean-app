import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { MemoryRouter, Route, Routes } from 'react-router-dom'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Convocation, ConvocationResponse, ConvocationStatus } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { ActiveDashboardRole } from '@domain/rules/active-role-scope'
import type { ConvocationResponderStatus } from '@domain/repositories/convocation-responders-repository'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'
import { useConvocationDetailViewModel } from './useConvocationDetailViewModel'

// canRespond's RBAC/deadline/activeRole combination, playerResponse's
// derivation from playerResponseQuery, the duplicate-upsert guards, the
// `others` self-exclusion filter, and (specs/coach-attendance-confirmation.md
// §2/§7) canValidateAttendance's RBAC/activeRole gate, the always-re-fires
// confirm mutation (AC-AT-03), its per-row saving/error state, and its
// dual cache invalidation (AC-AT-10) are the real logic living in this
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

function buildMatchDetails(overrides: Partial<MatchDetails> = {}): MatchDetails {
  return {
    convocationId: CONVOCATION_ID,
    opponentId: 'opponent-1',
    isHome: true,
    meetingPointTime: '2026-08-27T16:30:00.000Z',
    meetingPointLocation: 'Vestiaires',
    ...overrides,
  }
}

function renderViewModel(options: {
  convocation?: Convocation | null
  activeRole?: ActiveDashboardRole
  playerResponse?: ConvocationResponse | null
  responders?: ConvocationResponderStatus[]
  matchDetails?: MatchDetails | null
}) {
  const convocation = options.convocation === undefined ? buildConvocation() : options.convocation
  const matchDetails = options.matchDetails === undefined ? null : options.matchDetails

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
  const getConvocationWithDetailsUseCase = { execute: vi.fn().mockResolvedValue(convocation ? { convocation, matchDetails, opponent: null, meetingDetails: null } : null) }
  const updateMatchDetailsUseCase = {
    execute: vi.fn().mockResolvedValue(buildMatchDetails()),
  }
  const confirmAttendanceUseCase = {
    execute: vi.fn().mockResolvedValue({
      id: 'attendance-1',
      convocationId: CONVOCATION_ID,
      userId: USER_ID,
      actualStatus: 'present',
      absenceValidity: null,
      note: null,
      validatedBy: 'coach-1',
      validatedAt: '2026-08-27T19:00:00.000Z',
    }),
  }
  mockedUseConvocationDependencies.mockReturnValue({
    teamRepository: { findById: vi.fn().mockResolvedValue({ id: TEAM_ID, name: 'Équipe 1', sectionId: 'section-1', seasonId: 'season-1' }) },
    getConvocationWithDetailsUseCase,
    listConvocationRespondersUseCase,
    getConvocationRosterForCoachUseCase,
    getConvocationResponseByUserUseCase,
    respondToConvocationUseCase,
    confirmAttendanceUseCase,
    updateMatchDetailsUseCase,
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
    getConvocationWithDetailsUseCase,
    confirmAttendanceUseCase,
    updateMatchDetailsUseCase,
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

  // specs/coach-attendance-confirmation.md §2 — same RBAC/activeRole gate
  // shape as canRespond above, moindre privilège (AC-AT-06/07): a coach+
  // player multi-role account must not see coach controls with "Joueur"
  // active even though the underlying can() check would pass.
  it.each<[string, ActiveDashboardRole, boolean, boolean]>([
    ['authorized coach', 'coach', true, true],
    ['RBAC denied', 'coach', false, false],
    ['player active, even with the permission granted', 'player', true, false],
  ])('canValidateAttendance — %s', async (_label, activeRole, rbac, expected) => {
    mockedUsePermission.mockReturnValue(rbac)
    const { result } = renderViewModel({ activeRole })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canValidateAttendance).toBe(expected)
  })

  // AC-AT-03 — the opposite contract from onRespondPresent/onRespondAbsent's
  // duplicate-upsert guard above: re-tapping the same confirmed state must
  // still re-fire the upsert (last-value-wins, idempotent on the server
  // side), never be silently skipped client-side.
  it('re-fires the upsert on every call, even repeated taps for the same actualStatus (AC-AT-03)', async () => {
    mockedUsePermission.mockReturnValue(true)
    const { result, confirmAttendanceUseCase } = renderViewModel({ activeRole: 'coach' })
    act(() => result.current.setActiveTab('effectif'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    result.current.onConfirmAttendancePresent('player-1')
    await waitFor(() => expect(confirmAttendanceUseCase.execute).toHaveBeenCalledTimes(1))

    result.current.onConfirmAttendancePresent('player-1')
    await waitFor(() => expect(confirmAttendanceUseCase.execute).toHaveBeenCalledTimes(2))

    expect(confirmAttendanceUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({ userId: 'player-1', actualStatus: 'present' }),
    )
  })

  it('scopes savingUserId to the row currently in flight and clears it once the upsert settles', async () => {
    mockedUsePermission.mockReturnValue(true)
    let resolveUpsert!: () => void
    const { result, confirmAttendanceUseCase } = renderViewModel({ activeRole: 'coach' })
    act(() => result.current.setActiveTab('effectif'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    confirmAttendanceUseCase.execute.mockReturnValueOnce(
      new Promise((resolve) => {
        resolveUpsert = () =>
          resolve({
            id: 'attendance-1',
            convocationId: CONVOCATION_ID,
            userId: 'player-1',
            actualStatus: 'present',
            absenceValidity: null,
            note: null,
            validatedBy: 'coach-1',
            validatedAt: '2026-08-27T19:00:00.000Z',
          })
      }),
    )

    act(() => result.current.onConfirmAttendancePresent('player-1'))
    await waitFor(() => expect(result.current.savingUserId).toBe('player-1'))

    await act(async () => {
      resolveUpsert()
      await Promise.resolve()
    })

    await waitFor(() => expect(result.current.savingUserId).toBeNull())
  })

  it('sets a per-row error message on failure, keyed by userId, and clears it on the next attempt for that row', async () => {
    mockedUsePermission.mockReturnValue(true)
    const { result, confirmAttendanceUseCase } = renderViewModel({ activeRole: 'coach' })
    act(() => result.current.setActiveTab('effectif'))
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    confirmAttendanceUseCase.execute.mockRejectedValueOnce(new Error('network down'))

    act(() => result.current.onConfirmAttendanceAbsent('player-1'))
    await waitFor(() => expect(result.current.attendanceErrorByUserId['player-1']).toBeTruthy())

    act(() => result.current.onConfirmAttendancePresent('player-1'))
    await waitFor(() => expect(result.current.attendanceErrorByUserId['player-1']).toBeUndefined())
  })

  // AC-AT-10, spec §7 "mentor-agent" note — confirming attendance can flip
  // the convocation's status via the DB trigger, so both the coach-roster
  // AND the convocation-detail queries must refetch, not just the roster
  // (unlike respondMutation's onSuccess, which only touches roster/
  // responders keys).
  it('invalidates both the coach roster and the convocation detail queries on a successful confirmation (AC-AT-10)', async () => {
    mockedUsePermission.mockReturnValue(true)
    const { result, confirmAttendanceUseCase, getConvocationRosterForCoachUseCase, getConvocationWithDetailsUseCase } = renderViewModel({ activeRole: 'coach' })
    act(() => result.current.setActiveTab('effectif'))
    await waitFor(() => expect(getConvocationRosterForCoachUseCase.execute).toHaveBeenCalledTimes(1))
    expect(getConvocationWithDetailsUseCase.execute).toHaveBeenCalledTimes(1)

    act(() => result.current.onConfirmAttendancePresent('player-1'))
    await waitFor(() => expect(confirmAttendanceUseCase.execute).toHaveBeenCalledTimes(1))

    await waitFor(() => expect(getConvocationRosterForCoachUseCase.execute).toHaveBeenCalledTimes(2))
    await waitFor(() => expect(getConvocationWithDetailsUseCase.execute).toHaveBeenCalledTimes(2))
  })

  // specs/edit-match-details.md §2/UI design §2 — the 5-condition
  // composition, same "absent, never disabled" shape as canRespond/
  // canValidateAttendance above (activeRole/roleMatchesConvocationTeam
  // reproduce the exact same multi-role guard, §2 "limite assumée").
  it.each<[string, ActiveDashboardRole, boolean, 'training' | 'match', ConvocationStatus, number, boolean]>([
    ['player active, even with the permission granted', 'player', true, 'match', 'open', 30, false],
    ['RBAC denied', 'coach', false, 'match', 'open', 30, false],
    ['not a match convocation', 'coach', true, 'training', 'open', 30, false],
    ['closed', 'coach', true, 'match', 'closed', 30, false],
    ['cancelled', 'coach', true, 'match', 'cancelled', 30, false],
    ['kickoff already passed', 'coach', true, 'match', 'open', -30, false],
    ['authorized coach, match, open, before kickoff', 'coach', true, 'match', 'open', 30, true],
  ])('canEditMatchDetails — %s', async (_label, activeRole, rbac, type, status, minutesFromNow, expected) => {
    mockedUsePermission.mockReturnValue(rbac)
    const date = new Date(Date.now() + minutesFromNow * 60_000).toISOString()
    const { result } = renderViewModel({
      convocation: buildConvocation({ type, status, date }),
      activeRole,
      matchDetails: buildMatchDetails(),
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canEditMatchDetails).toBe(expected)
  })

  it('seeds the edit form from the current matchDetails, keeps Enregistrer disabled until a field actually changes, and submits the combined ISO value', async () => {
    mockedUsePermission.mockReturnValue(true)
    // Zeroed seconds/ms: kickoffDate/kickoffTime only round-trip at
    // minute-granularity (native `type="date"`/`type="time"` wire formats),
    // so an exact-ISO comparison below needs `kickoff` itself to already
    // sit on a whole minute.
    const kickoff = new Date(Date.now() + 60 * 60_000)
    kickoff.setSeconds(0, 0)
    const meetingPointTime = new Date(kickoff.getTime() - 30 * 60_000)
    const matchDetails = buildMatchDetails({ isHome: true, meetingPointTime: meetingPointTime.toISOString(), meetingPointLocation: 'Vestiaires' })
    const { result, updateMatchDetailsUseCase } = renderViewModel({
      convocation: buildConvocation({ type: 'match', status: 'open', date: kickoff.toISOString() }),
      activeRole: 'coach',
      matchDetails,
    })

    await waitFor(() => expect(result.current.canEditMatchDetails).toBe(true))

    act(() => result.current.onStartEditMatchDetails())
    expect(result.current.isEditingMatchDetails).toBe(true)
    expect(result.current.matchDetailsFormValues).toEqual({
      kickoffDate: expect.any(String),
      kickoffTime: expect.any(String),
      matchLocation: 'Stade',
      isHome: true,
      meetingPointTime: expect.any(String),
      meetingPointLocation: 'Vestiaires',
    })
    // Freshly seeded from the CURRENT matchDetails/convocation — nothing
    // edited yet.
    expect(result.current.canSubmitMatchDetails).toBe(false)

    act(() => result.current.setMatchDetailsMeetingPointLocation('Parking visiteurs'))
    expect(result.current.canSubmitMatchDetails).toBe(true)

    act(() => result.current.onSubmitMatchDetails())
    await waitFor(() => expect(updateMatchDetailsUseCase.execute).toHaveBeenCalledTimes(1))

    expect(updateMatchDetailsUseCase.execute).toHaveBeenCalledWith(
      expect.objectContaining({
        convocationId: CONVOCATION_ID,
        arrangements: expect.objectContaining({
          isHome: true,
          meetingPointLocation: 'Parking visiteurs',
        }),
        // Developer decision (2026-09-25) — every submit now ALSO carries
        // the convocation's own (here unedited, but still submitted)
        // date/location, since both writes share the one "Enregistrer" tap.
        convocationArrangements: { date: kickoff.toISOString(), location: 'Stade' },
      }),
    )
    // No separate RDV date field is exposed (docs/designs/coach-match-details/...
    // shows only an hour for "RDV ÉQUIPE") — the RDV stays on kickoff's own
    // calendar day, combined behind the scenes at submit.
    const call = updateMatchDetailsUseCase.execute.mock.calls[0][0]
    expect(new Date(call.arrangements.meetingPointTime).toDateString()).toBe(kickoff.toDateString())

    await waitFor(() => expect(result.current.isEditingMatchDetails).toBe(false))
  })

  // Developer decision (2026-09-25) — widens the original scope: the coach
  // may also correct the convocation's own kickoff date/time and venue.
  it('lets the coach correct the kickoff date/time and venue, combined into convocationArrangements at submit', async () => {
    mockedUsePermission.mockReturnValue(true)
    const kickoff = new Date(Date.now() + 60 * 60_000)
    const matchDetails = buildMatchDetails({ meetingPointTime: new Date(kickoff.getTime() - 30 * 60_000).toISOString() })
    const { result, updateMatchDetailsUseCase } = renderViewModel({
      convocation: buildConvocation({ type: 'match', status: 'open', date: kickoff.toISOString(), location: 'Stade municipal' }),
      activeRole: 'coach',
      matchDetails,
    })

    await waitFor(() => expect(result.current.canEditMatchDetails).toBe(true))
    act(() => result.current.onStartEditMatchDetails())
    expect(result.current.canSubmitMatchDetails).toBe(false)

    act(() => result.current.setMatchDetailsMatchLocation('Nouveau stade'))
    expect(result.current.canSubmitMatchDetails).toBe(true)

    act(() => result.current.onSubmitMatchDetails())
    await waitFor(() => expect(updateMatchDetailsUseCase.execute).toHaveBeenCalledTimes(1))

    const call = updateMatchDetailsUseCase.execute.mock.calls[0][0]
    expect(call.convocationArrangements.location).toBe('Nouveau stade')
    expect(new Date(call.convocationArrangements.date).toDateString()).toBe(kickoff.toDateString())
  })

  it('onCancelEditMatchDetails discards the in-progress edit without calling the use case', async () => {
    mockedUsePermission.mockReturnValue(true)
    const kickoff = new Date(Date.now() + 60 * 60_000)
    const matchDetails = buildMatchDetails({ meetingPointTime: new Date(kickoff.getTime() - 30 * 60_000).toISOString() })
    const { result, updateMatchDetailsUseCase } = renderViewModel({
      convocation: buildConvocation({ type: 'match', status: 'open', date: kickoff.toISOString() }),
      activeRole: 'coach',
      matchDetails,
    })

    await waitFor(() => expect(result.current.canEditMatchDetails).toBe(true))

    act(() => result.current.onStartEditMatchDetails())
    act(() => result.current.setMatchDetailsMeetingPointLocation('Parking visiteurs'))
    act(() => result.current.onCancelEditMatchDetails())

    expect(result.current.isEditingMatchDetails).toBe(false)
    expect(result.current.matchDetailsFormValues).toBeNull()
    expect(updateMatchDetailsUseCase.execute).not.toHaveBeenCalled()
  })
})
