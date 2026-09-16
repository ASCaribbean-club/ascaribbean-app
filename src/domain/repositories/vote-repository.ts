import type { Vote, VoteCategoryId } from '@domain/entities/vote'

// Write-side + "my own vote" read — mirrors ConvocationResponseRepository's
// split from ConvocationRespondersRepository (own-state CRUD vs. aggregate
// view). Every method here reads/writes a SINGLE voter's own row, scoped by
// RLS to auth.uid() once the migration exists (AC-PV-06) — never a listing
// of other voters' rows. For the aggregate everyone else's tab consumes, see
// VoteTallyRepository instead (AC-PV-10 depends on the two staying separate
// interfaces, not just separate methods on one).
export interface VoteRepository {
  // AC-PV-04/AC-PV-05 — upsert-on-conflict on (convocationId, categoryId,
  // voterId), never insert-and-grow (CLAUDE.md §6). Implementation stays a
  // TODO stub: the table/constraint this maps to doesn't exist yet
  // (specs/player-vote.md §7 — PO-PV-01 is resolved, nothing blocks writing
  // the migration now).
  upsert(vote: Omit<Vote, 'id'>): Promise<Vote>

  // Backs the bulletin's own pre-selected state and the "vote enregistré" /
  // "changer mon vote" branch (UI design, "États à couvrir") — `null` means
  // this voter hasn't voted in this category yet, distinct from a category
  // with zero votes overall (see VoteTallyRepository).
  findMyVote(convocationId: string, categoryId: VoteCategoryId, voterId: string): Promise<Vote | null>
}
