import type { TeamMvpDto } from '../dto/team-mvp-dto'

export function toMvpUserIds(dtos: TeamMvpDto[]): string[] {
  return dtos.map((dto) => dto.user_id)
}
