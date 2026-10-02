import { describe, expect, it } from 'vitest'
import { ListMissionTemplatesUseCase } from './ListMissionTemplatesUseCase'
import { aMissionTemplate, fakeMissionTemplateRepository } from './mission-template-fakes'

describe('ListMissionTemplatesUseCase', () => {
  it('returns every template, inactive included', async () => {
    const rows = [aMissionTemplate(), aMissionTemplate({ id: 'mt-2', isActive: false })]
    const useCase = new ListMissionTemplatesUseCase(fakeMissionTemplateRepository({ listAll: async () => rows }))

    await expect(useCase.execute()).resolves.toEqual(rows)
  })
})
