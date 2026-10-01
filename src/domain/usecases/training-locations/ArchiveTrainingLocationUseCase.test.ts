import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '../../errors/forbidden-error'
import { ArchiveTrainingLocationUseCase } from './ArchiveTrainingLocationUseCase'
import { adminUser, coachUser, fakeTrainingLocationRepository, fakeUserRepository } from './training-location-fakes'

describe('ArchiveTrainingLocationUseCase', () => {
  it('archives the location for an admin', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new ArchiveTrainingLocationUseCase(fakeUserRepository(adminUser()), repo)

    const result = await useCase.execute({ actorId: 'admin-1', trainingLocationId: 'loc-1' })

    expect(repo.archive).toHaveBeenCalledWith('loc-1')
    expect(result.isArchived).toBe(true)
  })

  it('is idempotent: archiving twice succeeds both times', async () => {
    const repo = fakeTrainingLocationRepository()
    const useCase = new ArchiveTrainingLocationUseCase(fakeUserRepository(adminUser()), repo)

    await useCase.execute({ actorId: 'admin-1', trainingLocationId: 'loc-1' })
    await expect(useCase.execute({ actorId: 'admin-1', trainingLocationId: 'loc-1' })).resolves.toMatchObject({ isArchived: true })
  })

  it('throws ForbiddenError for a non-admin and for an unknown actor', async () => {
    const repo = fakeTrainingLocationRepository()

    await expect(
      new ArchiveTrainingLocationUseCase(fakeUserRepository(coachUser()), repo).execute({ actorId: 'coach-1', trainingLocationId: 'loc-1' }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    await expect(
      new ArchiveTrainingLocationUseCase(fakeUserRepository(null), repo).execute({ actorId: 'ghost', trainingLocationId: 'loc-1' }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.archive).not.toHaveBeenCalled()
  })
})
