// Raw shape of public.meeting_details — 1:1 satellite of convocations, PK =
// FK (specs/create-convocation.md §2). `title` added mid-pass alongside the
// pre-existing `agenda` (see domain/entities/meeting-details.ts).
export interface MeetingDetailsRow {
  convocation_id: string
  title: string
  agenda: string[] // jsonb string[] column, no position/id per item (§2)
}