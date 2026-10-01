import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTrainingLocationInputError } from '../../errors/invalid-training-location-input-error'
import { CreateTrainingLocationUseCase } from './CreateTrainingLocationUseCase'
import { adminUser, coachUser, fakeTrainingLocationRepository, fakeUserRepository } from './training-location-fakes'

describe('CreateTrainingLocationUseCase', () => {
  it('trims name and address and creates the location', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new CreateTrainingLocationUseCase(fakeUserRepository(adminUser()), repo)

    const result = await useCase.execute({ actorId: 'admin-1', name: '  Terrain A ', address: ' 1 rue du Stade  ' })

    expect(repo.create).toHaveBeenCalledWith({ name: 'Terrain A', address: '1 rue du Stade' })
    expect(result.name).toBe('Terrain A')
  })

  it('throws ForbiddenError when the actor does not exist, without any write', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new CreateTrainingLocationUseCase(fakeUserRepository(null), repo)

    await expect(useCase.execute({ actorId: 'ghost', name: 'A', address: 'B' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError for a non-admin, before validating the input', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new CreateTrainingLocationUseCase(fakeUserRepository(coachUser()), repo)

    await expect(useCase.execute({ actorId: 'coach-1', name: '', address: '' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.create).not.toHaveBeenCalled()
  })

  it.each([
    ['empty name', '', '1 rue du Stade'],
    ['whitespace-only name', '   ', '1 rue du Stade'],
    ['empty address', 'Terrain A', ''],
    ['whitespace-only address', 'Terrain A', '   '],
  ])('rejects %s with InvalidTrainingLocationInputError and no network call', async (_label, name, address) => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new CreateTrainingLocationUseCase(fakeUserRepository(adminUser()), repo)

    await expect(useCase.execute({ actorId: 'admin-1', name, address })).rejects.toBeInstanceOf(InvalidTrainingLocationInputError)
    expect(repo.create).not.toHaveBeenCalled()
  })
})
