import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { UpdateMissionTemplateUseCase } from './UpdateMissionTemplateUseCase'
import { adminUser, coachUser, fakeMissionTemplateRepository, fakeUserRepository } from './mission-template-fakes'

const valid = { actorId: 'admin-1', missionTemplateId: 'mt-1', label: '  Gonfler les ballons ', defaultCapacity: 3, description: null }

describe('UpdateMissionTemplateUseCase', () => {
  it('trims the label and updates the same row, without a type', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new UpdateMissionTemplateUseCase(fakeUserRepository(adminUser()), repo)

    const result = await useCase.execute(valid)

    expect(repo.update).toHaveBeenCalledWith('mt-1', { label: 'Gonfler les ballons', defaultCapacity: 3, description: null })
    expect(result.id).toBe('mt-1')
  })

  it('throws ForbiddenError for an unknown actor and for a non-admin, without any write', async () => {
    const repo = fakeMissionTemplateRepository()
    await expect(new UpdateMissionTemplateUseCase(fakeUserRepository(null), repo).execute(valid)).rejects.toBeInstanceOf(ForbiddenError)
    await expect(
      new UpdateMissionTemplateUseCase(fakeUserRepository(coachUser()), repo).execute({ ...valid, actorId: 'coach-1', label: '' }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('normalizes the description and rejects one over 500 characters', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new UpdateMissionTemplateUseCase(fakeUserRepository(adminUser()), repo)

    await useCase.execute({ ...valid, description: '  Détails  ' })
    await useCase.execute({ ...valid, description: '  ' })
    await expect(useCase.execute({ ...valid, description: 'a'.repeat(501) })).rejects.toBeInstanceOf(InvalidMissionTemplateError)

    expect(repo.update).toHaveBeenNthCalledWith(1, 'mt-1', expect.objectContaining({ description: 'Détails' }))
    expect(repo.update).toHaveBeenNthCalledWith(2, 'mt-1', expect.objectContaining({ description: null }))
    expect(repo.update).toHaveBeenCalledTimes(2)
  })

  it.each([
    ['empty label', '', 1],
    ['whitespace-only label', '  ', 1],
    ['capacity 0', 'Eau', 0],
    ['capacity 4', 'Eau', 4],
  ])('rejects %s with InvalidMissionTemplateError and no repository call', async (_name, label, defaultCapacity) => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new UpdateMissionTemplateUseCase(fakeUserRepository(adminUser()), repo)

    await expect(useCase.execute({ ...valid, label, defaultCapacity })).rejects.toBeInstanceOf(InvalidMissionTemplateError)
    expect(repo.update).not.toHaveBeenCalled()
  })
})
