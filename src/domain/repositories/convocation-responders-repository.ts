import type { PlayerPosition } from '../entities/user'

// docs/convocation_visibility_rls_correction.md §4 — backs the player-facing
// "qui a répondu" block (specs/match_details_page.md §1 point 4, AC-MD-09)
// AND the roster-completion half of the coach view (PO-MD-03): both need
// "who's convoked, and have they responded yet", just consumed differently
// (see domain/usecases/convocation/ — ListConvocationRespondersUseCase vs
// GetConvocationRosterForCoachUseCase).
//
// Deliberately NOT `status: DeclaredStatus` — `hasResponded` is a boolean by
// design (docs/convocation_visibility_rls_correction.md §2.1): the whole
// point of `convocation_responders` existing as a separate view from
// `convocation_responses` is that it can never carry the actual
// present/absent value, only whether a response was recorded at all.
export interface ConvocationResponderStatus {
  userId: string
  hasResponded: boolean
  displayName: string
  // Non-sensitive, unlike hasResponded/displayName's own visibility story —
  // exposed by the same RPC as a plain extra column (20260901125851_user_
  // player_position.sql), not a second privacy boundary to design around.
  position: PlayerPosition | null
}

export interface ConvocationRespondersRepository {
  // Full convoked roster for this convocation, one entry per player —
  // including players with no `convocation_responses` row yet (AC-MD-09,
  // "en attente" rather than absent from the list). Team-scoping is
  // enforced by the get_convocation_responders RPC's own explicit team-
  // membership check, not by this interface — an out-of-scope convocationId
  // resolves to an empty array, same "no existence leak" shape as
  // ConvocationRepository.findById returning null (specs/match_details_page.md
  // §1, "Périmètre de données").
  listForConvocation(convocationId: string): Promise<ConvocationResponderStatus[]>
}
