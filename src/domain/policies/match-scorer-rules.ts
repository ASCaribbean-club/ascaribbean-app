import type { ActualStatus, DeclaredStatus } from '../entities/convocation'

// specs/match-stats.md MS-13/AC-MS-14 — SOFT rule, used ONLY to build the
// result-entry screen's scorer/carded-player picker (never enforced by a
// use case or a database constraint — MS-13, AC-MS-14's own "aucun use case
// ni aucune contrainte de base ne refuse"). The coach-confirmed
// AttendanceRecord takes precedence over the player's own declared
// ConvocationResponse, exactly the "AttendanceRecord et ConvocationResponse
// restent deux entités distinctes, jamais fusionnées" rule (CLAUDE.md §6) —
// this reads both without merging them into one.
//
// Deliberately takes only `actualStatus`/`status`, never `reason`
// (ConvocationResponse.reason is free text that can carry a medical
// motive, specs/match-stats.md §3) — the shape itself makes it structurally
// impossible for a caller to thread `reason` through this predicate by
// accident.
export interface ScorerEligibilityInput {
  actualStatus: ActualStatus | null
  status: DeclaredStatus
}

export function isEligibleScorer({ actualStatus, status }: ScorerEligibilityInput): boolean {
  // The coach's confirmed fact wins outright, in EITHER direction — a
  // confirmed absence overrides even a declared "present" response
  // (PO-MS-04 accepts the reverse inconsistency, confirming present after
  // already crediting a goal, as a known limitation, not fixed here).
  if (actualStatus !== null) return actualStatus === 'present'

  return status === 'present'
}
