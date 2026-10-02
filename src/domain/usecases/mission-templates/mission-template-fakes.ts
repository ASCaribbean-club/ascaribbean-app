// Shared test doubles for the mission-templates use case tests only.
import { vi } from 'vitest'
import type { MissionTemplate } from '@domain/entities/mission-template'
import type { MissionTemplateRepository } from '@domain/repositories/mission-template-repository'
import { adminUser, coachUser, fakeUserRepository } from '../training-locations/training-location-fakes'

export { adminUser, coachUser, fakeUserRepository }

export function aMissionTemplate(overrides: Partial<MissionTemplate> = {}): MissionTemplate {
  return { id: 'mt-1', convocationType: 'training', label: 'Apporter l’eau', defaultCapacity: 1, description: null, isActive: true, ...overrides }
}

export function fakeMissionTemplateRepository(overrides: Partial<MissionTemplateRepository> = {}): MissionTemplateRepository {
  return {
    listAll: vi.fn(async () => []),
    create: vi.fn(async (input) => aMissionTemplate({ ...input })),
    update: vi.fn(async (id, input) => aMissionTemplate({ id, ...input })),
    setActive: vi.fn(async (id, isActive) => aMissionTemplate({ id, isActive })),
    ...overrides,
  }
}
