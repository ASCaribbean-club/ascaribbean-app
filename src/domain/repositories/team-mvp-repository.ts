import type { VoteCategoryId } from '@domain/entities/vote'

// Aggregate-only, like VoteTallyRepository (AC-PV-10): candidate ids, never a
// voter identity.
export interface TeamMvpRepository {
  // Ids of the team's current "joueur du match": the most voted candidate(s)
  // of the latest match whose vote is closed. Several ids on a tie, empty
  // when no closed vote has received a vote yet.
  getCurrentMvpIds(teamId: string, categoryId: VoteCategoryId): Promise<string[]>
}
