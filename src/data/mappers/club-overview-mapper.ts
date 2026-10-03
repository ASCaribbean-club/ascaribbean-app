import type { ClubOverview } from '@domain/entities/club-overview'
import type { ClubOverviewDto } from '../dto/club-overview-dto'

export function toClubOverview(dto: ClubOverviewDto): ClubOverview {
  return {
    sectionsCount: dto.sections_count,
    membersCount: dto.members_count,
  }
}
