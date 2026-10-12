// `get_convocation_response_counts` RPC return value, not a table/view row —
// XxxDto convention (CLAUDE.md §4). See
// supabase/migrations/20261011100000_convocation_response_counts_rpc.sql.
export interface ConvocationResponseCountsDto {
  convocation_id: string
  present_count: number
  absent_count: number
  pending_count: number
}
