import { describe, expect, it, vi } from 'vitest'
import type { Season } from '../../entities/season'
import type { TreasurerDue } from '../../entities/treasurer-due'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { TreasurerDueRepository } from '../../repositories/treasurer-due-repository'
import { GetTreasurerDuesUseCase } from './GetTreasurerDuesUseCase'

const season: Season = { id: 'season-1', label: '2026-2027', startDate: '2026-09-01', endDate: '2027-06-30', cotisationAmount: 80 }

function seasonRepository(current: Season | null): SeasonRepository {
  return { findCurrent: async () => current } as unknown as SeasonRepository
}

function duesRepository(dues: TreasurerDue[]): TreasurerDueRepository {
  return { listCurrentSeasonDues: vi.fn(async () => dues) }
}

const noAmountDue: TreasurerDue = { membershipId: 'm-1', memberName: 'Joueur A', amountDueCents: null, sections: [], payments: [] }

describe('GetTreasurerDuesUseCase', () => {
  it('returns a null season and no entries, without reading dues, when no season is in progress', async () => {
    const repository = duesRepository([noAmountDue])
    const report = await new GetTreasurerDuesUseCase(repository, seasonRepository(null)).execute()

    expect(report).toEqual({ season: null, entries: [] })
    expect(repository.listCurrentSeasonDues).not.toHaveBeenCalled()
  })

  it('returns the season label and one computed entry per due, with the season tariff as fallback amount', async () => {
    const report = await new GetTreasurerDuesUseCase(duesRepository([noAmountDue]), seasonRepository(season)).execute()

    expect(report.season).toEqual({ id: 'season-1', label: '2026-2027' })
    expect(report.entries).toHaveLength(1)
    expect(report.entries[0]).toMatchObject({ membershipId: 'm-1', amountDueCents: 8000, status: 'unpaid', remainingCents: 8000 })
  })

  it('returns an empty entry list for a season without memberships', async () => {
    const report = await new GetTreasurerDuesUseCase(duesRepository([]), seasonRepository(season)).execute()
    expect(report).toEqual({ season: { id: 'season-1', label: '2026-2027' }, entries: [] })
  })

  it('propagates a repository error (e.g. a non-treasurer caller refused by the database)', async () => {
    const repository: TreasurerDueRepository = {
      listCurrentSeasonDues: async () => {
        throw new Error('forbidden')
      },
    }
    await expect(new GetTreasurerDuesUseCase(repository, seasonRepository(season)).execute()).rejects.toThrow('forbidden')
  })
})
