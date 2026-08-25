import type { Opponent } from '@domain/entities/opponent'
import type { OpponentRow } from '../dto/opponent-dto'

export const OpponentMapper = {
  toDomain(row: OpponentRow): Opponent {
    return {
      id: row.id,
      name: row.name,
    }
  },
}
