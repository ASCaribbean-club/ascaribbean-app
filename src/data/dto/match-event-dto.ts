// Raw shape of public.match_events — see
// supabase/migrations/20260924100000_match_statistics_schema.sql. `minute`
// is deliberately not modeled anywhere, domain included (specs/match-stats.md
// §7, "omettre la minute" — UI-MS-D stays open, but no column backs it).
export interface MatchEventRow {
  id: string
  convocation_id: string
  user_id: string
  event_type: 'goal' | 'penalty_missed' | 'yellow_card' | 'red_card'
  is_penalty: boolean
  created_by: string
  created_at: string
}
