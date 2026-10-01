import { describe, expect, it, vi } from 'vitest'
import type { AdminConvocationFilters } from '../../entities/admin-convocation'
import type { AdminConvocationRepository } from '../../repositories/admin-convocation-repository'
import { ListAdminConvocationsUseCase } from './ListAdminConvocationsUseCase'

const FILTERS: AdminConvocationFilters = {
  seasonId: 'season-1',
  sectionId: null,
  teamId: null,
  type: null,
  period: 'all',
  unrecordedOnly: false,
}
const NOW = new Date('2026-10-01T12:00:00.000Z')

function setup() {
  const list = vi.fn(async () => ({ items: [], hasMore: false }))
  const useCase = new ListAdminConvocationsUseCase({ list } as unknown as AdminConvocationRepository)
  return { useCase, list }
}

describe('ListAdminConvocationsUseCase', () => {
  it('passes the filters, page and clock through to the repository (server-side filtering)', async () => {
    const { useCase, list } = setup()
    await useCase.execute({ filters: FILTERS, page: 2, now: NOW })
    expect(list).toHaveBeenCalledExactlyOnceWith(FILTERS, 2, NOW)
  })

  it.each([-1, 1.5, Number.NaN])('normalises the nonsensical page %s to 0', async (page) => {
    const { useCase, list } = setup()
    await useCase.execute({ filters: FILTERS, page, now: NOW })
    expect(list).toHaveBeenCalledWith(FILTERS, 0, NOW)
  })
})
