import type { ClubOverview } from '../../entities/club-overview'
import type { ClubOverviewRepository } from '../../repositories/club-overview-repository'

// Authorization is the database function's own role check (RLS-only read,
// no matrix entry): this use case just forwards the integers.
export class GetClubOverviewUseCase {
  constructor(private readonly clubOverviewRepository: ClubOverviewRepository) {}

  execute(): Promise<ClubOverview> {
    return this.clubOverviewRepository.getOverview()
  }
}
