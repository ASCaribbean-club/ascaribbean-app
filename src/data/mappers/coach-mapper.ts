import type { TeamCoach } from '@domain/repositories/coach-repository'
import type { CoachDto } from '@data/dto/coach-dto'

export function toTeamCoach(dto: CoachDto): TeamCoach {
  return {
    id: dto.user_id,
    fullName: dto.full_name,
  }
}
