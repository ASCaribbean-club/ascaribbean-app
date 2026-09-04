import type { Convocation } from '@domain/entities/convocation'
import type { MatchDetails } from '@domain/entities/match-details'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { Opponent } from '@domain/entities/opponent'
import type { CalendarResponseBlock } from './calendar-response-block'

// The normalized shape CalendarConvocationList/CalendarConvocationRow
// render, regardless of whether it originated from
// ListTeamConvocationsUseCase's ConvocationForCoach (coach — carries
// `responseCounts`) or ListUConvocationsForPlayerUseCase's
// ConvocationForPlayer (player — carries `myResponse`). Folding the
// role difference into `responseBlock` here, once, in
// useCalendarViewModel, is what keeps the row component itself role-
// agnostic (§2 "Variantes de rendu par rôle" is a ViewModel concern).
export interface CalendarListItem {
  convocation: Convocation
  matchDetails: MatchDetails | null
  opponent: Opponent | null
  meetingDetails: MeetingDetails | null
  responseBlock: CalendarResponseBlock
}
