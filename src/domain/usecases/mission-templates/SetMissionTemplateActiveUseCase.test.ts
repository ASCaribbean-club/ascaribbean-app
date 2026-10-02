import { describe, expect, it } from 'vitest'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { SetMissionTemplateActiveUseCase } from './SetMissionTemplateActiveUseCase'
import { adminUser, coachUser, fakeMissionTemplateRepository, fakeUserRepository } from './mission-template-fakes'

describe('SetMissionTemplateActiveUseCase', () => {
  it('deactivates and reactivates for an admin', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new SetMissionTemplateActiveUseCase(fakeUserRepository(adminUser()), repo)

    await expect(useCase.execute({ actorId: 'admin-1', missionTemplateId: 'mt-1', isActive: false })).resolves.toMatchObject({ isActive: false })
    await expect(useCase.execute({ actorId: 'admin-1', missionTemplateId: 'mt-1', isActive: true })).resolves.toMatchObject({ isActive: true })
    expect(repo.setActive).toHaveBeenNthCalledWith(1, 'mt-1', false)
    expect(repo.setActive).toHaveBeenNthCalledWith(2, 'mt-1', true)
  })

  it('is idempotent in both directions', async () => {
    const repo = fakeMissionTemplateRepository()
    const useCase = new SetMissionTemplateActiveUseCase(fakeUserRepository(adminUser()), repo)

    for (const isActive of [false, true]) {
      await useCase.execute({ actorId: 'admin-1', missionTemplateId: 'mt-1', isActive })
      await expect(useCase.execute({ actorId: 'admin-1', missionTemplateId: 'mt-1', isActive })).resolves.toMatchObject({ isActive })
    }
  })

  it('throws ForbiddenError for a non-admin and for an unknown actor', async () => {
    const repo = fakeMissionTemplateRepository()
    await expect(
      new SetMissionTemplateActiveUseCase(fakeUserRepository(coachUser()), repo).execute({ actorId: 'coach-1', missionTemplateId: 'mt-1', isActive: false }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    await expect(
      new SetMissionTemplateActiveUseCase(fakeUserRepository(null), repo).execute({ actorId: 'ghost', missionTemplateId: 'mt-1', isActive: false }),
    ).rejects.toBeInstanceOf(ForbiddenError)
    expect(repo.setActive).not.toHaveBeenCalled()
  })
})
