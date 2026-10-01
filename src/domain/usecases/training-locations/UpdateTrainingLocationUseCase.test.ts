import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidTrainingLocationInputError } from '../../errors/invalid-training-location-input-error'
import { UpdateTrainingLocationUseCase } from './UpdateTrainingLocationUseCase'
import { adminUser, coachUser, fakeTrainingLocationRepository, fakeUserRepository } from './training-location-fakes'

describe('UpdateTrainingLocationUseCase', () => {
  it('trims and updates the SAME row', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new UpdateTrainingLocationUseCase(fakeUserRepository(adminUser()), repo)

    await useCase.execute({ actorId: 'admin-1', trainingLocationId: 'loc-9', name: ' Nouveau nom ', address: ' Nouvelle adresse ' })

    expect(repo.update).toHaveBeenCalledWith('loc-9', { name: 'Nouveau nom', address: 'Nouvelle adresse' })
  })

  it('throws ForbiddenError when the actor does not exist', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new UpdateTrainingLocationUseCase(fakeUserRepository(null), repo)

    await expect(useCase.execute({ actorId: 'ghost', trainingLocationId: 'loc-1', name: 'A', address: 'B' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it('throws ForbiddenError for a non-admin', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new UpdateTrainingLocationUseCase(fakeUserRepository(coachUser()), repo)

    await expect(useCase.execute({ actorId: 'coach-1', trainingLocationId: 'loc-1', name: 'A', address: 'B' })).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.update).not.toHaveBeenCalled()
  })

  it.each([
    ['empty name', '', 'B'],
    ['whitespace-only name', '  ', 'B'],
    ['empty address', 'A', ''],
    ['whitespace-only address', 'A', '  '],
  ])('rejects %s without a network call', async (_label, name, address) => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new UpdateTrainingLocationUseCase(fakeUserRepository(adminUser()), repo)

    await expect(useCase.execute({ actorId: 'admin-1', trainingLocationId: 'loc-1', name, address })).rejects.toBeInstanceOf(
      InvalidTrainingLocationInputError,
    )
    expect(repo.update).not.toHaveBeenCalled()
  })
})
