export type ConvocationType = 'training' | 'match' | 'meeting'
export type ConvocationStatus = 'open' | 'closed' | 'cancelled'

export interface Convocation {
  id: string
  teamId: string
  type: ConvocationType
  date: string // ISO date
  location: string
  status: ConvocationStatus
  closedAt: string | null
  closedBy: string | null // userId of the coach whose validation completed the record set
  cancelledAt: string | null
  cancelledBy: string | null
  cancellationReason: string | null

  // specs/create-convocation.md §2 — added by that pass. Ordinary business
  // data (author), symmetric with closedBy/cancelledBy above — not an
  // audit-log concern (§4). Not type-conditional, unlike the match/meeting
  // fields below, which is why it lives directly here rather than on a
  // satellite entity.
  createdBy: string
}

// specs/edit-match-details.md, developer decision (2026-09-25) widening
// that spec's original scope: the coach may also correct the match's own
// kickoff (`date`) and venue (`location`) — not just MatchDetails'
// logistics — as long as the match hasn't begun yet. `Pick<>`, same
// reasoning as MatchArrangements (domain/entities/match-details.ts): makes
// writing any OTHER Convocation field (type, teamId, status, closedBy,
// cancelledBy, createdBy, ...) through this path a compile error, not a
// runtime guard someone has to remember to keep enforcing.
export type ConvocationArrangements = Pick<Convocation, 'date' | 'location'>

// --- Player-declared intent, submitted before the event ---

export type DeclaredStatus = 'pending' | 'present' | 'absent'

export interface ConvocationResponse {
  id: string
  convocationId: string
  userId: string
  status: DeclaredStatus
  reason: string | null // free text, player-supplied, only relevant if status === 'absent'
  respondedAt: string | null // ISO date
}

// --- Coach/admin-confirmed fact, submitted at or after the event ---

export type ActualStatus = 'present' | 'absent'
export type AbsenceValidity = 'excused' | 'unexcused'

export interface AttendanceRecord {
  id: string
  convocationId: string
  userId: string
  actualStatus: ActualStatus
  absenceValidity: AbsenceValidity | null // relevant only if actualStatus === 'absent'
  note: string | null // free-text comment from the coach (e.g. guest player, late arrival)
  validatedBy: string // userId of the coach or admin
  validatedAt: string // ISO date
}
