// specs/create-convocation.md §2, corrected per the satellite-table pattern
// established for MeetingDetails (see meeting-details.ts): a nullable field
// whose validity depends on another column (Convocation.type) doesn't belong
// on Convocation itself — it goes on a 1:1 satellite entity, PK = FK, created
// only when the need is concrete (already true here: opponentId/isHome are
// PO-CV-02, meetingPointTime/meetingPointLocation are the RDV fields, the
// RDV/kickoff ordering rule is PO-CV-09 — all already specified, unlike
// training's still-undefined "programme" concept, see TrainingDetails TODO
// in convocation-rules.ts neighbourhood — no such file created here).
export interface MatchDetails {
  convocationId: string
  opponentId: string // references `opponents`, not `team_opponents` (§2)
  isHome: boolean
  meetingPointTime: string // ISO — the "RDV" time, distinct from Convocation.date (kickoff)
  meetingPointLocation: string // free text — the "RDV" location, distinct from Convocation.location
}
