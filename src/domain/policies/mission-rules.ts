// specs/web-mission-templates.md §2.1/§2.3 — pure mission-template rules.
// Manual mirror (CLAUDE.md §7) of the check constraints on
// public.mission_templates (supabase/migrations/*_web_mission_templates.sql):
//   - isValidMissionLabel    <-> check (btrim(label) <> '')
//   - isValidMissionCapacity <-> check (default_capacity between 1 and 3)
//   - MIN_/MAX_MISSION_CAPACITY <-> the 1 and 3 bounds of that same check
//   - isValidMissionDescription / MAX_MISSION_DESCRIPTION_LENGTH
//     <-> check (description is null or char_length(description) <= 500)
export const MIN_MISSION_CAPACITY = 1
export const MAX_MISSION_CAPACITY = 3

// Developer-to-confirm default (specs/web-mission-templates.md).
export const MAX_MISSION_DESCRIPTION_LENGTH = 500

export function isValidMissionCapacity(capacity: number): boolean {
  return Number.isInteger(capacity) && capacity >= MIN_MISSION_CAPACITY && capacity <= MAX_MISSION_CAPACITY
}

export function isValidMissionLabel(label: string): boolean {
  return label.trim() !== ''
}

// null (absent) is valid; a string is valid up to the max length.
export function isValidMissionDescription(description: string | null): boolean {
  return description === null || description.length <= MAX_MISSION_DESCRIPTION_LENGTH
}

// Trimmed; blank or whitespace-only means "absent" -> null.
export function normalizeMissionDescription(description: string | null | undefined): string | null {
  const trimmed = (description ?? '').trim()
  return trimmed === '' ? null : trimmed
}

// specs/match-details-missions.md §2.4/AC-MM-12 — may this user be registered
// on a mission? Pure: the eligible people (PO-MM-06, assumed: the players of
// the convocation's team) are PASSED IN, same pattern as `requiredUserIds` in
// convocation-closure.ts. Mirrored by the target check inside the claim_mission
// RPC (supabase/migrations/*_match_details_missions.sql).
export function isEligibleMissionAssignee(userId: string, eligibleUserIds: string[]): boolean {
  return eligibleUserIds.includes(userId)
}
