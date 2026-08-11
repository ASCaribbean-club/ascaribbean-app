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
}

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
