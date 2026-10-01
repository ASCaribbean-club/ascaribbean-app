import { describe, expect, it } from 'vitest'
import { ListAvailableTrainingLocationsUseCase } from './ListAvailableTrainingLocationsUseCase'
import { ListTrainingLocationsUseCase } from './ListTrainingLocationsUseCase'
import { aTrainingLocation, fakeTrainingLocationRepository } from './training-location-fakes'

describe('ListTrainingLocationsUseCase', () => {
  it('returns the admin list from findAll, archived rows included', async () => {
    const rows = [aTrainingLocation(), aTrainingLocation({ id: 'loc-2', isArchived: true })]
    const useCase = new ListTrainingLocationsUseCase(fakeTrainingLocationRepository({ findAll: async () => rows }))

    await expect(useCase.execute()).resolves.toEqual(rows)
  })
})

describe('ListAvailableTrainingLocationsUseCase', () => {
  it('returns the non-archived options from findAvailable', async () => {
    const rows = [aTrainingLocation()]
    const useCase = new ListAvailableTrainingLocationsUseCase(fakeTrainingLocationRepository({ findAvailable: async () => rows }))

    await expect(useCase.execute()).resolves.toEqual(rows)
  })

  it('resolves an empty list without error (valid state)', async () => {
    const useCase = new ListAvailableTrainingLocationsUseCase(fakeTrainingLocationRepository())

    await expect(useCase.execute()).resolves.toEqual([])
  })
})
