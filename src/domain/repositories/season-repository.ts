import type { Season } from '../entities/season'

export interface SeasonRepository {
  findById(id: string): Promise<Season | null>
  findAll(): Promise<Season[]>
}
