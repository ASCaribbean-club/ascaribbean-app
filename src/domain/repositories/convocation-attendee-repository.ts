// specs/convocation-player-selection.md §4 — write side of the list of
// convoked players AFTER creation. At creation, the list travels with the
// convocation itself (ConvocationRepository.create*, one transaction).
// Reading the list stays on ConvocationRespondersRepository (identity +
// "a répondu" badge): the list is "current state" data and is never exposed
// with response status to a player.
export interface ConvocationAttendeeRepository {
  // Adds ONE player. The database is the authority: team player only
  // (AC-CPS-04), coach of the team only, open convocation before kickoff
  // (PO-CPS-06), at most 14 for an official match (AC-CPS-06). Writes nothing
  // to convocation_responses / attendance_records / the lineup (AC-CPS-19).
  add(convocationId: string, userId: string): Promise<void>

  // Among `convocationIds`, the ones on which `userId` is a convoked player.
  // Backs the "Non convoqué(e)" state of the player's dashboard / calendar
  // (PO-CPS-03). Read under the team-scoped RLS of the list: a player sees the
  // rows of their own team's convocations.
  listConvokedConvocationIds(userId: string, convocationIds: string[]): Promise<string[]>
}
