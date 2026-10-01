// specs/player-unavailability.md §1 — a bounded-in-time record, NOT a field on
// User (no `status` is ever stored on User) and NOT linked to
// ConvocationResponse / AttendanceRecord. "Available" is never stored: it is
// the absence of an active Unavailability, computed at read time
// (policies/availability.ts).
//
// No `teamId` on purpose: the scope of a suspension is undecided (PO-PU-03);
// team membership is resolved through the roster instead.

/** Calendar date, ISO `YYYY-MM-DD` (no time, no timezone). */
export type IsoDate = string

interface UnavailabilityBase {
  id: string
  userId: string
  startsOn: IsoDate
  /** userId of the coach who declared it. */
  declaredBy: string
  /** ISO timestamp of the declaration. */
  declaredAt: string
}

// DELIBERATELY NO free-text field (note, reason, diagnosis...) on this
// variant: a medical unavailability is health data (GDPR art. 9) and free
// text is the vector through which diagnoses leak — same reasoning as
// ConvocationResponse.reason / attendance_records.note. Do not add one.
export interface MedicalUnavailability extends UnavailabilityBase {
  kind: 'medical'
  /** `null` = indefinite. Exclusive bound: available again ON this day. */
  expectedReturnOn: IsoDate | null
}

export interface SuspensionUnavailability extends UnavailabilityBase {
  kind: 'suspension'
  /** Informational only — no automatic countdown (PO-PU-04). */
  matchCount: number
  reason: string | null
  /** Manual lift. `null` = still active. Exclusive bound, like expectedReturnOn. */
  liftedOn: IsoDate | null
}

export type Unavailability = MedicalUnavailability | SuspensionUnavailability

// `Omit<Unavailability, 'id'>` collapses a discriminated union (Omit is not
// distributive: the variant-specific fields are lost). This distributes it so
// `create()` input keeps `expectedReturnOn` / `matchCount` / ... per `kind`.
export type NewUnavailability = Unavailability extends infer U ? (U extends Unavailability ? Omit<U, 'id'> : never) : never
