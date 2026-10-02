// Shared test doubles for the convocation-missions use case tests only —
// plain objects satisfying the domain interfaces.
import { vi } from 'vitest'
import type { Convocation } from '../../entities/convocation'
import type { ConvocationMission } from '../../entities/convocation-mission'
import type { User } from '../../entities/user'
import type { ConvocationMissionRepository } from '../../repositories/convocation-mission-repository'
import type { ConvocationRespondersRepository } from '../../repositories/convocation-responders-repository'
import type { ConvocationRepository } from '../../repositories/convocation-repository'
import type { TeamRepository } from '../../repositories/team-repository'
import { fakeUserRepository } from '../training-locations/training-location-fakes'

export { fakeUserRepository }

export const TEAM_ID = 'team-1'
export const SECTION_ID = 'section-1'
export const CONVOCATION_ID = 'convocation-1'
export const START = '2026-10-10T18:00:00.000Z'
// 31 minutes before START: self-service still open.
export const BEFORE_DEADLINE = new Date('2026-10-10T17:29:00.000Z')
// Exactly 30 minutes before START: closed.
export const AT_DEADLINE = new Date('2026-10-10T17:30:00.000Z')

function baseUser(id: string, roles: User['roles']): User {
  return { id, fullName: 'Membre', email: `${id}@example.com`, roles, position: null, age: null, handedness: null, charterAcceptedAt: null }
}

export const playerUser = (id = 'player-1', teamId = TEAM_ID) => baseUser(id, [{ role: 'player', teamId }])
export const coachOfTeam = () => baseUser('coach-1', [{ role: 'coach', teamIds: [TEAM_ID] }])
export const treasurerUser = () => baseUser('treasurer-1', [{ role: 'treasurer' }])
// A player of the team who also manages missions (multi-role): exempt from the deadline.
export const playerAndAdmin = () => baseUser('player-admin-1', [{ role: 'player', teamId: TEAM_ID }, { role: 'admin' }])

export function aConvocation(overrides: Partial<Convocation> = {}): Convocation {
  return {
    id: CONVOCATION_ID,
    teamId: TEAM_ID,
    type: 'match',
    date: START,
    location: 'Stade',
    trainingLocation: null,
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

export function fakeConvocationRepository(convocation: Convocation | null = aConvocation()): ConvocationRepository {
  return { findById: async () => convocation } as unknown as ConvocationRepository
}

export function fakeTeamRepository(): TeamRepository {
  return { findById: async () => ({ id: TEAM_ID, name: 'Équipe', sectionId: SECTION_ID, seasonId: 'season-1' }) } as unknown as TeamRepository
}

export function fakeRespondersRepository(userIds: string[]): ConvocationRespondersRepository {
  return {
    listForConvocation: vi.fn(async () => userIds.map((userId) => ({ userId, hasResponded: false, displayName: 'Membre', position: null }))),
  }
}

export function aMission(overrides: Partial<ConvocationMission> = {}): ConvocationMission {
  return { id: 'mission-1', convocationId: CONVOCATION_ID, templateId: null, label: 'Laver les maillots', capacity: 2, ...overrides }
}

export function fakeMissionRepository(overrides: Partial<ConvocationMissionRepository> = {}): ConvocationMissionRepository {
  return {
    listForConvocation: vi.fn(async () => []),
    claim: vi.fn(async (missionId, userId) => ({ missionId, userId, assignedBy: userId, assignedAt: START })),
    release: vi.fn(async () => {}),
    addAdHoc: vi.fn(async (input) => aMission({ ...input })),
    remove: vi.fn(async () => {}),
    ...overrides,
  }
}
