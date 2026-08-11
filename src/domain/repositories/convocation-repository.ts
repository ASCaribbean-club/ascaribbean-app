import type { Convocation } from '../entities/convocation'

export interface ConvocationRepository {
  listForTeam(teamId: string): Promise<Convocation[]>
  findById(id: string): Promise<Convocation | null>
}
