import type { NewUnavailability, Unavailability } from '@domain/entities/unavailability'

// specs/player-unavailability.md §1 — implemented by data/repositories/UnavailabilityRepositoryImpl.ts.
export interface UnavailabilityRepository {
  create(input: NewUnavailability): Promise<Unavailability>
  update(u: Unavailability): Promise<Unavailability>
  findByUser(userId: string): Promise<Unavailability[]>
  // Resolved through the roster in the future Impl: Unavailability carries
  // no teamId (PO-PU-03).
  findByTeam(teamId: string): Promise<Unavailability[]>
}
