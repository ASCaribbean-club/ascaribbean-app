import type { ActualStatus } from '../entities/convocation'

// specs/web-create-convocation.md §3/AC-WC-27/AC-WC-30 — pure diff between
// what is stored and what an admin chose. A choice only counts when it differs
// from the stored value (a player without a row counts as `null`, so any choice
// is a change). One entry per player (last choice wins).
export interface AttendanceChoice {
  userId: string
  actualStatus: ActualStatus
}

export interface AttendanceChange extends AttendanceChoice {
  previousStatus: ActualStatus | null
}

export function diffAttendance(
  stored: ReadonlyMap<string, ActualStatus>,
  choices: readonly AttendanceChoice[],
): AttendanceChange[] {
  const lastChoiceByUser = new Map<string, ActualStatus>()
  for (const choice of choices) lastChoiceByUser.set(choice.userId, choice.actualStatus)

  const changes: AttendanceChange[] = []
  for (const [userId, actualStatus] of lastChoiceByUser) {
    const previousStatus = stored.get(userId) ?? null
    if (previousStatus !== actualStatus) changes.push({ userId, actualStatus, previousStatus })
  }
  return changes
}
