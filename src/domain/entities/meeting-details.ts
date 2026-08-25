// specs/create-convocation.md §2 — "Ordre du jour de réunion", corrected to
// also carry `title` (mid-pass correction: any meeting-only field is
// type-conditional on Convocation, so it belongs here, not on Convocation
// itself — same reasoning as MatchDetails, see match-details.ts).
// 1:1 satellite of Convocation (type === 'meeting' only). Convocation itself
// carries neither `agenda` nor `title` — this entity owns both, kept
// alongside `convocation.ts` per ARCHITECTURE.md §3's "flat entity files"
// convention (no per-entity subfolder).
export interface MeetingDetails {
  convocationId: string
  title: string
  agenda: string[] // ordered — array order IS display order, no `position` column (§2)
}
