import type { Season } from '../../entities/season'
import type { SeasonRepository } from '../../repositories/season-repository'
import type { TreasurerDueRepository } from '../../repositories/treasurer-due-repository'
import { toDueEntry, type TreasurerDueEntry } from '../../rules/treasurer-dues-rules'

export interface TreasurerDuesReport {
  // null = no season in progress (PO-TR-08): an explicit fallback, never a
  // silent empty list.
  season: Pick<Season, 'id' | 'label'> | null
  entries: TreasurerDueEntry[]
}

// specs/mobile-treasurer.md §2 — one aggregated read (AC-TR-24) plus the
// current season (label + tariff fallback, PO-TR-03). Authorization is the
// database function's own role check (RLS/RPC-only read, no matrix entry).
export class GetTreasurerDuesUseCase {
  constructor(
    private readonly treasurerDueRepository: TreasurerDueRepository,
    private readonly seasonRepository: SeasonRepository,
  ) {}

  async execute(): Promise<TreasurerDuesReport> {
    const season = await this.seasonRepository.findCurrent()
    if (!season) return { season: null, entries: [] }

    const dues = await this.treasurerDueRepository.listCurrentSeasonDues()
    return {
      season: { id: season.id, label: season.label },
      entries: dues.map((due) => toDueEntry(due, season.cotisationAmount)),
    }
  }
}
