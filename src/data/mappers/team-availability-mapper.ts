import type { TeamAvailabilityRow } from '@domain/repositories/team-availability-repository'
import type { TeamAvailabilityDto } from '@data/dto/team-availability-dto'

export function toTeamAvailabilityRow(dto: TeamAvailabilityDto): TeamAvailabilityRow {
  switch (dto.status) {
    case 'available':
    case 'medical':
    case 'suspended':
    case 'unavailable':
      return {
        userId: dto.user_id,
        displayName: dto.full_name,
        status: dto.status,
        startsOn: dto.starts_on,
        endsOn: dto.ends_on,
      }
    default:
      throw new Error(`Unknown availability status: ${dto.status}`)
  }
}
