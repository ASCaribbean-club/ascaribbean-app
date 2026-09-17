import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { Team } from '@domain/entities/team'
import { useSectionAndTeamsDependencies } from '@presentation/di/hooks/use-section-and-teams-dependencies'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useBackofficeTeamsViewModel } from './useBackofficeTeamsViewModel'

// specs/section-and-teams.md AC-ST-44/§2.7 — the two pieces of real derived
// logic in this ViewModel (CLAUDE.md §8 carve-out for presentation tests):
// the "avec/sans coach" filter must answer from the EXACT SAME source as the
// COACH(S) column (never a second calculation), and canWriteTeams/
// canAssignCoach must stay two independently-computed booleans, never
// collapsed into one canWrite.

vi.mock('@presentation/di/hooks/use-section-and-teams-dependencies')
vi.mock('@presentation/shared/hooks/use-permission')

const mockedUseSectionAndTeamsDependencies = vi.mocked(useSectionAndTeamsDependencies)
const mockedUsePermission = vi.mocked(usePermission)

const SECTION_1 = { id: 'section-1', name: 'Senior masculin', type: 'football' as const, createdAt: '2026-01-01T00:00:00.000Z' }
// Wide open-ended bounds so this row is "current" regardless of the
// machine's real wall-clock date — the point under test is the mapping
// (season lookup → seasonStatus()), not seasonStatus()'s own boundary
// behavior (already covered by season-scope.test.ts).
const SEASON_CURRENT = { id: 'season-1', label: '2025-2026' as const, startDate: '2000-01-01', endDate: '2999-12-31' }

function buildTeam(overrides: Partial<Team> = {}): Team {
  return { id: 'team-1', name: 'Groupe A', sectionId: SECTION_1.id, seasonId: SEASON_CURRENT.id, ...overrides }
}

function renderViewModel({
  teams,
  coachAssignments,
  canWriteTeams = true,
  canAssignCoach = true,
}: {
  teams: Team[]
  coachAssignments: { teamId: string; coach: { id: string; fullName: string } }[]
  canWriteTeams?: boolean
  canAssignCoach?: boolean
}) {
  mockedUsePermission.mockImplementation((action) => {
    if (action === 'team:write') return canWriteTeams
    if (action === 'role:assign-coach') return canAssignCoach
    return false
  })
  mockedUseSectionAndTeamsDependencies.mockReturnValue({
    teamRepository: { findAllForAdmin: vi.fn().mockResolvedValue(teams) },
    sectionRepository: { findAll: vi.fn().mockResolvedValue([SECTION_1]) },
    seasonRepository: { findAll: vi.fn().mockResolvedValue([SEASON_CURRENT]) },
    coachRepository: { listAllAssignments: vi.fn().mockResolvedValue(coachAssignments) },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => (
    <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  )
  return renderHook(() => useBackofficeTeamsViewModel(), { wrapper })
}

describe('useBackofficeTeamsViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('builds a row per team with its resolved section name, season and coaches', async () => {
    const team = buildTeam()
    const { result } = renderViewModel({
      teams: [team],
      coachAssignments: [{ teamId: team.id, coach: { id: 'coach-1', fullName: 'Coach Un' } }],
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].sectionName).toBe('Senior masculin')
    expect(result.current.rows[0].season?.label).toBe('2025-2026')
    expect(result.current.rows[0].seasonStatus).toBe('current')
    expect(result.current.rows[0].coaches).toEqual([{ id: 'coach-1', fullName: 'Coach Un' }])
  })

  it('AC-ST-44 — the "sans coach" filter answers from the exact same source as the COACH(S) column', async () => {
    const teamWithCoach = buildTeam({ id: 'team-with-coach', name: 'Groupe A' })
    const teamWithoutCoach = buildTeam({ id: 'team-without-coach', name: 'Groupe B' })
    const { result } = renderViewModel({
      teams: [teamWithCoach, teamWithoutCoach],
      coachAssignments: [{ teamId: teamWithCoach.id, coach: { id: 'coach-1', fullName: 'Coach Un' } }],
    })

    await waitFor(() => expect(result.current.isLoading).toBe(false))
    expect(result.current.rows).toHaveLength(2)

    act(() => result.current.setCoachFilter('without'))
    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].team.id).toBe(teamWithoutCoach.id)
    expect(result.current.rows[0].coaches).toHaveLength(0)

    act(() => result.current.setCoachFilter('with'))
    expect(result.current.rows).toHaveLength(1)
    expect(result.current.rows[0].team.id).toBe(teamWithCoach.id)
  })

  it('isFilterActive is true as soon as any of the three filters is not "all"', async () => {
    const { result } = renderViewModel({ teams: [buildTeam()], coachAssignments: [] })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.isFilterActive).toBe(false)

    act(() => result.current.setSectionFilter(SECTION_1.id))
    expect(result.current.isFilterActive).toBe(true)

    act(() => result.current.setSectionFilter('all'))
    expect(result.current.isFilterActive).toBe(false)

    act(() => result.current.setCoachFilter('with'))
    expect(result.current.isFilterActive).toBe(true)
  })

  it('canWriteTeams and canAssignCoach are computed independently, never collapsed into one boolean', async () => {
    const { result } = renderViewModel({ teams: [], coachAssignments: [], canWriteTeams: true, canAssignCoach: false })
    await waitFor(() => expect(result.current.isLoading).toBe(false))

    expect(result.current.canWriteTeams).toBe(true)
    expect(result.current.canAssignCoach).toBe(false)
  })
})
