import type { ResponseSummary } from '../entities/response-summary'
import type { ConvocationResponse } from '../entities/convocation'

export interface ConvocationResponseRepository {
  upsert(response: Omit<ConvocationResponse, 'id'>): Promise<ConvocationResponse>
  findByConvocationAndUser(convocationId: string, userId: string): Promise<ConvocationResponse | null>
  // Added for specs/coach-dashboard.md — response bar + "À venir" rates need
  // every response for a convocation, not just one user's.
  findByConvocation(convocationId: string): Promise<ConvocationResponse[]>

  // specs/player-stats.md §6.3/PO-PS-02 — backed by get_my_response_summary(),
  // a SECURITY INVOKER RPC (convocation_responses_select_own_or_coach
  // already grants a player SELECT on their own rows, §6.2). No parameter —
  // filters on auth.uid() internally, same "never a userId" shape as
  // getOwnAttendanceSummary (AttendanceRecordRepository), AC-02.
  getOwnResponseSummary(): Promise<ResponseSummary>
}
