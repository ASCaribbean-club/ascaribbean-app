import type { Team } from '../entities/team'

export interface TeamRepository {
  findByIds(ids: string[]): Promise<Team[]>
  countActiveMembers(teamId: string): Promise<number>
  findById(id: string): Promise<Team | null>
}
