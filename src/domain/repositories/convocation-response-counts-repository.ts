import type { ResponseCounts } from '../rules/convocation-rules'

// Team-wide ✓/✗/? headcounts per convocation, readable by a PLAYER too
// (numbers only — who answered what stays coach-only, AC-MD-08/AC-MD-10).
// Backed by the get_convocation_response_counts RPC, whose own team-
// membership check is the authorization boundary: a convocation id outside
// the caller's scope is simply absent from the result.
export interface ConvocationResponseCountsRepository {
  countForConvocations(convocationIds: string[]): Promise<Record<string, ResponseCounts>>
}
