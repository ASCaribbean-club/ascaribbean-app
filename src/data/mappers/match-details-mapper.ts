import type { MatchDetails } from '@domain/entities/match-details'
import type { MatchDetailsRow } from '../dto/match-details-dto'

export function toMatchDetails(row: MatchDetailsRow): MatchDetails {
  return {
    convocationId: row.convocation_id,
    opponentId: row.opponent_id,
    isHome: row.is_home,
    meetingPointTime: row.meeting_point_time,
    meetingPointLocation: row.meeting_point_location,
    goalsFor: row.goals_for,
    goalsAgainst: row.goals_against,
  }
}

export function toMatchDetailsRow(details: MatchDetails): MatchDetailsRow {
  return {
    convocation_id: details.convocationId,
    opponent_id: details.opponentId,
    is_home: details.isHome,
    meeting_point_time: details.meetingPointTime,
    meeting_point_location: details.meetingPointLocation,
    goals_for: details.goalsFor,
    goals_against: details.goalsAgainst,
  }
}