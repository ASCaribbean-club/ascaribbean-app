import type { MatchEventRepository } from '../../repositories/match-event-repository'

// specs/match-stats.md MS-11/AC-MS-12 — Coach/Staff's own delete path
// (`match_result:record`, mirrors match_events_delete_record). Thin
// pass-through: no timing/consistency rule gates a delete, only an add (MS-12
// only ever mentions "score et événements ne sont enregistrables" —
// deleting is not a form of recording).
//
// ⚠️ specs/match-stats.md §3, PO-MS-13 — flagged, NOT implemented: a
// deletion is a destructive, nominative write with no audit trail (the
// table isn't append-only and carries no UPDATE either). If/when the
// referent RGPD confirms it needs logging, that call belongs HERE
// (ARCHITECTURE.md §6, "depuis le use case, jamais depuis un composant") —
// do not add it before that decision is made.
export class DeleteMatchEventUseCase {
  constructor(private readonly matchEventRepository: MatchEventRepository) {}

  async execute(eventId: string): Promise<void> {
    await this.matchEventRepository.delete(eventId)
  }
}
