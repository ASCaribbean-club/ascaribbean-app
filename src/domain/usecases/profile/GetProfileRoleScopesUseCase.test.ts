import { describe, expect, it } from 'vitest'
import type { RoleAssignment } from '../../entities/user'
import type { CoachRepository, TeamCoach } from '../../repositories/coach-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { SectionRepository } from '../../repositories/section-repository'
import type { TeamRepository } from '../../repositories/team-repository'
import { GetProfileRoleScopesUseCase } from './GetProfileRoleScopesUseCase'

// In-memory fakes, same pattern as sibling use case tests — no Supabase
// mock needed, domain/ is plain TypeScript.
function fakeTeamRepository(teams: Record<string, { name: string; sectionId?: string }>): TeamRepository {
  const toTeam = (id: string) => ({ id, name: teams[id].name, sectionId: teams[id].sectionId ?? 's1', seasonId: 'season-1' })
  return {
    findByIds: async (ids) => ids.filter((id) => id in teams).map(toTeam),
    findById: async (id) => (id in teams ? toTeam(id) : null),
    countActiveMembers: async () => 0,
    findAllForAdmin: async () => Object.keys(teams).map(toTeam),
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
  }
}

function fakeSectionRepository(names: Record<string, string>): SectionRepository {
  return {
    findById: async (id) => (id in names ? { id, name: names[id], type: 'football', createdAt: '2026-01-01' } : null),
    findAll: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
  }
}

function fakeCoachRepository(coachesByTeam: Record<string, TeamCoach[]>): CoachRepository {
  return {
    listForTeam: async (teamId) => coachesByTeam[teamId] ?? [],
    listAllAssignments: async () =>
      Object.entries(coachesByTeam).flatMap(([teamId, coaches]) => coaches.map((coach) => ({ teamId, coach }))),
  }
}

function fakeSeasonRepository(label: string | null = '2026-2027'): SeasonRepository {
  return {
    findCurrent: async () => (label ? { id: 'season-1', label: label as `${number}-${number}`, startDate: '2026-08-01', endDate: '2027-06-30' } : null),
    // Not exercised by this use case (it only ever calls findCurrent) —
    // specs/web-seasons.md §2.6 extended SeasonRepository with these three
    // methods, unrelated to this test's own concern.
    findAll: async () => [],
    create: async () => {
      throw new Error('not implemented')
    },
    update: async () => {
      throw new Error('not implemented')
    },
  }
}

describe('GetProfileRoleScopesUseCase', () => {
  it("resolves the player's coach names, section and season alongside their team's scope line (2026-09-04 addendum)", async () => {
    const roles: RoleAssignment[] = [{ role: 'player', teamId: 'team-1' }]
    const useCase = new GetProfileRoleScopesUseCase(
      fakeTeamRepository({ 'team-1': { name: 'U15 Garçons', sectionId: 'section-football' } }),
      fakeSectionRepository({ 'section-football': 'Football' }),
      fakeCoachRepository({ 'team-1': [{ id: 'coach-1', fullName: 'Coach A' }] }),
      fakeSeasonRepository('2026-2027'),
    )

    await expect(useCase.execute({ roles })).resolves.toEqual([
      { role: 'player', scopeLines: ['U15 Garçons'], coachNames: ['Coach A'], sectionNames: ['Football'], seasonLabel: '2026-2027' },
    ])
  })

  it('deduplicates coaches and sections shared across a hypothetical multi-team player', async () => {
    const roles: RoleAssignment[] = [
      { role: 'player', teamId: 'team-1' },
      { role: 'player', teamId: 'team-2' },
    ]
    const sharedCoach: TeamCoach = { id: 'coach-1', fullName: 'Coach A' }
    const useCase = new GetProfileRoleScopesUseCase(
      fakeTeamRepository({
        'team-1': { name: 'U15 Garçons', sectionId: 'section-football' },
        'team-2': { name: 'U17 Garçons', sectionId: 'section-football' },
      }),
      fakeSectionRepository({ 'section-football': 'Football' }),
      fakeCoachRepository({ 'team-1': [sharedCoach], 'team-2': [sharedCoach] }),
      fakeSeasonRepository('2026-2027'),
    )

    const [scope] = await useCase.execute({ roles })
    expect(scope.coachNames).toEqual(['Coach A'])
    expect(scope.sectionNames).toEqual(['Football'])
  })

  it('returns a null seasonLabel when there is no current season (gap between two seasons)', async () => {
    const roles: RoleAssignment[] = [{ role: 'player', teamId: 'team-1' }]
    const useCase = new GetProfileRoleScopesUseCase(
      fakeTeamRepository({ 'team-1': { name: 'U15 Garçons' } }),
      fakeSectionRepository({}),
      fakeCoachRepository({}),
      fakeSeasonRepository(null),
    )

    const [scope] = await useCase.execute({ roles })
    expect(scope.seasonLabel).toBeNull()
  })

  it('never resolves coach names, section names or season for a role other than player', async () => {
    const roles: RoleAssignment[] = [{ role: 'coach', teamIds: ['team-1'] }]
    let coachRepositoryCalled = false
    const coachRepository: CoachRepository = {
      listForTeam: async () => {
        coachRepositoryCalled = true
        return []
      },
      // specs/section-and-teams.md §2.11 — added by that feature to
      // CoachRepository, unrelated to this test's own assertions; stubbed
      // so the mock keeps satisfying the interface.
      listAllAssignments: () => Promise.resolve([]),
    }
    const useCase = new GetProfileRoleScopesUseCase(
      fakeTeamRepository({ 'team-1': { name: 'U15 Garçons' } }),
      fakeSectionRepository({}),
      coachRepository,
      fakeSeasonRepository('2026-2027'),
    )

    const [scope] = await useCase.execute({ roles })
    expect(scope.coachNames).toEqual([])
    expect(scope.sectionNames).toEqual([])
    expect(scope.seasonLabel).toBeNull()
    expect(coachRepositoryCalled).toBe(false)
  })

  it('returns empty coachNames/sectionNames and a null seasonLabel for the 5 club-wide roles, same convention as scopeLines', async () => {
    const roles: RoleAssignment[] = [{ role: 'treasurer' }]
    const useCase = new GetProfileRoleScopesUseCase(fakeTeamRepository({}), fakeSectionRepository({}), fakeCoachRepository({}), fakeSeasonRepository('2026-2027'))

    await expect(useCase.execute({ roles })).resolves.toEqual([
      { role: 'treasurer', scopeLines: [], coachNames: [], sectionNames: [], seasonLabel: null },
    ])
  })
})
