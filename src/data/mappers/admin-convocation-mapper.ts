import type { AdminConvocationListItem } from '@domain/entities/admin-convocation'
import type { AdminConvocationDto, OneOrMany } from '../dto/admin-convocation-dto'
import { toConvocation } from './convocation-mapper'

function firstOf<T>(value: OneOrMany<T>): T | null {
  if (value === null || value === undefined) return null
  return Array.isArray(value) ? (value[0] ?? null) : value
}

// CLAUDE.md §4 — always a mapper between DTO and entity. Never throws: a
// missing embed degrades to a neutral value (empty name, null creator), the
// row stays listable.
export function toAdminConvocationListItem(dto: AdminConvocationDto): AdminConvocationListItem {
  const team = firstOf(dto.teams)
  const match = firstOf(dto.match_details)
  const meeting = firstOf(dto.meeting_details)
  const records = dto.attendance_records ?? []

  return {
    convocation: toConvocation(dto),
    teamName: team?.name ?? '',
    sectionId: team?.section_id ?? '',
    seasonId: team?.season_id ?? '',
    creatorName: firstOf(dto.users)?.full_name ?? null,
    match: match
      ? {
          opponentId: match.opponent_id,
          opponentName: firstOf(match.opponents)?.name ?? null,
          isHome: match.is_home,
          meetingPointTime: match.meeting_point_time,
          meetingPointLocation: match.meeting_point_location,
        }
      : null,
    meeting: meeting ? { title: meeting.title, agenda: meeting.agenda ?? [] } : null,
    attendance: {
      present: records.filter((record) => record.actual_status === 'present').length,
      absent: records.filter((record) => record.actual_status === 'absent').length,
      rosterSize: (team?.user_roles ?? []).filter((assignment) => assignment.role === 'player').length,
    },
  }
}
