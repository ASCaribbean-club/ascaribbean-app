// Shared test doubles for the training-locations use case tests only —
// plain objects satisfying the domain interfaces, no mocking machinery.
import { vi } from 'vitest'
import type { TrainingLocation } from '../../entities/training-location'
import type { User } from '../../entities/user'
import type { TrainingLocationRepository } from '../../repositories/training-location-repository'
import type { UserRepository } from '../../repositories/user-repository'

export function adminUser(): User {
  return { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.com', roles: [{ role: 'admin' }], position: null, age: null, handedness: null, charterAcceptedAt: null }
}

export function coachUser(): User {
  return { id: 'coach-1', fullName: 'Coach', email: 'coach@example.com', roles: [{ role: 'coach', teamIds: ['team-1'] }], position: null, age: null, handedness: null, charterAcceptedAt: null }
}

export function fakeUserRepository(user: User | null): UserRepository {
  return {
    findById: async () => user,
    acceptCharter: async () => {},
    findAll: async () => [],
    findAdminDirectory: async () => [],
    findMissingElementFacts: async () => [],
    updateProfile: async () => {},
    invite: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=invite' }),
    reissueInvitationLink: async () => ({ url: 'https://app.example.com/activation?token_hash=fake&type=magiclink' }),
    generatePasswordResetLink: async () => ({ url: 'https://app.example.com/update-password?token_hash=fake&type=recovery' }),
  }
}

export function aTrainingLocation(overrides: Partial<TrainingLocation> = {}): TrainingLocation {
  return { id: 'loc-1', name: 'Terrain A', address: '1 rue du Stade', isArchived: false, ...overrides }
}

export function fakeTrainingLocationRepository(overrides: Partial<TrainingLocationRepository> = {}): TrainingLocationRepository {
  return {
    findAll: vi.fn(async () => []),
    findAvailable: vi.fn(async () => []),
    create: vi.fn(async (input) => aTrainingLocation({ ...input })),
    update: vi.fn(async (id, input) => aTrainingLocation({ id, ...input })),
    archive: vi.fn(async (id) => aTrainingLocation({ id, isArchived: true })),
    ...overrides,
  }
}
