import type { Convocation, ConvocationType } from './convocation'

// specs/web-create-convocation.md §1/UI design — the backoffice list's own
// read model: one convocation plus everything the row and its expandable
// panel display, delivered in a single round trip (the panel needs no
// separate load). Read-only; the write paths use their own narrow inputs.
export interface AdminConvocationMatchInfo {
  opponentId: string
  // null only if the opponent row can't be resolved (never expected: FK).
  opponentName: string | null
  isHome: boolean
  meetingPointTime: string | null
  meetingPointLocation: string | null
}

export interface AdminConvocationMeetingInfo {
  title: string
  agenda: string[]
}

// AC-WC-08 — counts of AttendanceRecord, NEVER of ConvocationResponse.
export interface AdminConvocationAttendanceCounts {
  present: number
  absent: number
  // Number of players on the team's roster, to derive "non saisis".
  rosterSize: number
}

export interface AdminConvocationListItem {
  convocation: Convocation
  teamName: string
  sectionId: string
  seasonId: string
  // null when the creator account can't be resolved ("—" in the panel).
  creatorName: string | null
  match: AdminConvocationMatchInfo | null
  meeting: AdminConvocationMeetingInfo | null
  attendance: AdminConvocationAttendanceCounts
}

export type AdminConvocationPeriod = 'all' | 'upcoming' | 'past'

// AC-WC-06 — every filter is executed server-side. `null` = no restriction
// (for the season, no season exists at all).
export interface AdminConvocationFilters {
  seasonId: string | null
  sectionId: string | null
  teamId: string | null
  type: ConvocationType | null
  period: AdminConvocationPeriod
  // "Présences non saisies" pastille — see isAttendancePending
  // (domain/policies/convocation-admin-windows.ts).
  unrecordedOnly: boolean
  // Calendar view: restricts to [from, to) (ISO instants). Absent in the list view.
  dateRange?: { from: string; to: string }
}

export interface AdminConvocationPage {
  items: AdminConvocationListItem[]
  hasMore: boolean
}
