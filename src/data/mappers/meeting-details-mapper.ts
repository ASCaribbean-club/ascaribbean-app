import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { MeetingDetailsRow } from '../dto/meeting-details-dto'

export function toMeetingDetails(row: MeetingDetailsRow): MeetingDetails {
  return {
    convocationId: row.convocation_id,
    title: row.title,
    agenda: row.agenda,
  }
}

export function toMeetingDetailsRow(details: MeetingDetails): MeetingDetailsRow {
  return {
    convocation_id: details.convocationId,
    title: details.title,
    agenda: details.agenda,
  }
}