import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { CreateMissionTemplateUseCase } from './CreateMissionTemplateUseCase'
import { adminUser, coachUser, fakeMissionTemplateRepository, fakeUserRepository } from './mission-template-fakes'

const valid = { actorId: 'admin-1', convocationType: 'match', label: '  Laver les maillots ', defaultCapacity: 2, description: null } as const

describe('CreateMissionTemplateUseCase', () => {
  it('trims the label and creates an active template of the given type', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new CreateMissionTemplateUseCase(fakeUserRepository(adminUser()), repo)

    const result = await useCase.execute(valid)

    expect(repo.create).toHaveBeenCalledWith({ convocationType: 'match', label: 'Laver les maillots', defaultCapacity: 2, description: null })
    expect(result.isActive).toBe(true)
    expect(result.label).toBe('Laver les maillots')
  })

  it('throws ForbiddenError for an unknown actor, without any write', async () => {
    const repo = fakeMissionTemplateRepository()
    await expect(new CreateMissionTemplateUseCase(fakeUserRepository(null), repo).execute(valid)).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError for a non-admin before validating the input', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new CreateMissionTemplateUseCase(fakeUserRepository(coachUser()), repo)

    await expect(useCase.execute({ ...valid, actorId: 'coach-1', label: '', defaultCapacity: 9 })).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('trims the description and stores blank or whitespace-only as null', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new CreateMissionTemplateUseCase(fakeUserRepository(adminUser()), repo)

    await useCase.execute({ ...valid, description: '  Penser aux gourdes  ' })
    await useCase.execute({ ...valid, description: '   ' })

    expect(repo.create).toHaveBeenNthCalledWith(1, expect.objectContaining({ description: 'Penser aux gourdes' }))
    expect(repo.create).toHaveBeenNthCalledWith(2, expect.objectContaining({ description: null }))
  })

  it('accepts a 500-character description and rejects 501 without a repository call', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new CreateMissionTemplateUseCase(fakeUserRepository(adminUser()), repo)

    await expect(useCase.execute({ ...valid, description: 'a'.repeat(500) })).resolves.toBeDefined()
    await expect(useCase.execute({ ...valid, description: 'a'.repeat(501) })).rejects.toBeInstanceOf(InvalidMissionTemplateError)
    expect(repo.create).toHaveBeenCalledTimes(1)
  })

  it.each([
    ['empty label', '', 1],
    ['whitespace-only label', '   ', 1],
    ['capacity 0', 'Eau', 0],
    ['capacity 4', 'Eau', 4],
    ['fractional capacity', 'Eau', 2.5],
    ['NaN capacity', 'Eau', Number.NaN],
  ])('rejects %s with InvalidMissionTemplateError and no repository call', async (_name, label, defaultCapacity) => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new CreateMissionTemplateUseCase(fakeUserRepository(adminUser()), repo)

    await expect(useCase.execute({ ...valid, label, defaultCapacity })).rejects.toBeInstanceOf(InvalidMissionTemplateError)
    expect(repo.create).not.toHaveBeenCalled()
  })
})
