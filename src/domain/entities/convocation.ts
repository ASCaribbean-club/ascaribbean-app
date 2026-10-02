import type { TrainingLocation } from './training-location'

export type ConvocationType = 'training' | 'match' | 'meeting'
export type ConvocationStatus = 'open' | 'closed' | 'cancelled'

export interface Convocation {
  id: string
  teamId: string
  type: ConvocationType
  date: string // ISO timestamp (timestamptz) — carries the START TIME (kickoff / training or meeting start), not only the day
  // specs/web-localizations.md §2.2 — free text, now nullable: set for
  // match, meeting and training convocations created BEFORE the
  // training_locations table existed (legacy rows); null for a training
  // that references a TrainingLocation. Never read directly for display —
  // use getConvocationLocationLabel (domain/rules/convocation-location.ts).
  location: string | null
  // specs/web-localizations.md §2.2/§2.6 — the referenced venue, resolved
  // by join (name/address always current), null for match/meeting/legacy
  // training. An archived venue is still resolved here.
  trainingLocation: TrainingLocation | null
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
//
// specs/web-localizations.md §2.2/AC-WL-11 — `Convocation.location` is now
// `string | null`, but a match always has a non-null location (DB check
// constraint), so the edit path re-declares `location` as plain `string`:
// it must never become able to write null.
export type ConvocationArrangements = Pick<Convocation, 'date'> & { location: string }

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
