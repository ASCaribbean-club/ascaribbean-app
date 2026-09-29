import type { SupabaseClient } from '@supabase/supabase-js'
import { AttendanceRecordRepositoryImpl } from '@data/repositories/AttendanceRecordRepositoryImpl'
import { ConvocationResponseRepositoryImpl } from '@data/repositories/ConvocationResponseRepositoryImpl'
import { MatchEventRepositoryImpl } from '@data/repositories/MatchEventRepositoryImpl'
import type { AttendanceRecordRepository } from '@domain/repositories/attendance-record-repository'
import type { ConvocationResponseRepository } from '@domain/repositories/convocation-response-repository'
import type { MatchEventRepository } from '@domain/repositories/match-event-repository'
import { GetOwnAttendanceSummaryByTypeUseCase } from '@domain/usecases/player-stats/GetOwnAttendanceSummaryByTypeUseCase'
import { GetOwnAttendanceSummaryUseCase } from '@domain/usecases/player-stats/GetOwnAttendanceSummaryUseCase'
import { GetOwnCardsCountUseCase } from '@domain/usecases/player-stats/GetOwnCardsCountUseCase'
import { GetOwnGoalsCountUseCase } from '@domain/usecases/player-stats/GetOwnGoalsCountUseCase'
import { GetOwnResponseSummaryUseCase } from '@domain/usecases/player-stats/GetOwnResponseSummaryUseCase'

// specs/player-stats.md §6.3 — its own container, not folded into
// convocation-container.ts even though all three repository
// implementations already exist there: this feature's screen
// (PlayerStatsPage) is reached from Menu, entirely outside the convocation
// detail flow, and none of convocationContainer's other use cases are
// needed here — a dedicated, smaller container keeps
// usePlayerStatsDependencies() from pulling in convocation/vote/match-result
// wiring it has no use for.
export interface PlayerStatsContainer {
  // Repositories
  attendanceRecordRepository: AttendanceRecordRepository
  convocationResponseRepository: ConvocationResponseRepository
  matchEventRepository: MatchEventRepository

  // Use cases
  getOwnAttendanceSummaryUseCase: GetOwnAttendanceSummaryUseCase
  // specs/player-stats.md addendum "troisième passage" (PO-PS-12
  // partiellement tranché) — attendance-only breakdown by type.
  getOwnAttendanceSummaryByTypeUseCase: GetOwnAttendanceSummaryByTypeUseCase
  getOwnResponseSummaryUseCase: GetOwnResponseSummaryUseCase
  getOwnGoalsCountUseCase: GetOwnGoalsCountUseCase
  // specs/player-stats.md addendum "PO-PS-03 tranché" — own yellow/red cards.
  getOwnCardsCountUseCase: GetOwnCardsCountUseCase
}

export function createPlayerStatsContainer(supabaseClient: SupabaseClient): PlayerStatsContainer {
  const attendanceRecordRepository = new AttendanceRecordRepositoryImpl(supabaseClient)
  const convocationResponseRepository = new ConvocationResponseRepositoryImpl(supabaseClient)
  const matchEventRepository = new MatchEventRepositoryImpl(supabaseClient)

  return {
    attendanceRecordRepository,
    convocationResponseRepository,
    matchEventRepository,
    getOwnAttendanceSummaryUseCase: new GetOwnAttendanceSummaryUseCase(attendanceRecordRepository),
    getOwnAttendanceSummaryByTypeUseCase: new GetOwnAttendanceSummaryByTypeUseCase(attendanceRecordRepository),
    getOwnResponseSummaryUseCase: new GetOwnResponseSummaryUseCase(convocationResponseRepository),
    getOwnGoalsCountUseCase: new GetOwnGoalsCountUseCase(matchEventRepository),
    getOwnCardsCountUseCase: new GetOwnCardsCountUseCase(matchEventRepository),
  }
}
