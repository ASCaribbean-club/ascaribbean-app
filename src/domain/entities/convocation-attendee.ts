// A player convoked to a convocation (`convocation_attendees` row): the set of
// users whose attendance must be confirmed before the convocation can close.
export interface ConvocationAttendee {
  convocationId: string
  userId: string
}
