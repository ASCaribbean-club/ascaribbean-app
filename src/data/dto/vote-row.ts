// Raw shape of `public.votes` — see
// supabase/migrations/20260916171955_player_vote_schema.sql. Column names
// mirror attendance_records' own conventions (snake_case, *_at timestamps).
//
// category_id stays a `text` column (matching `vote_categories.id`'s own
// type, PO-PV-03) rather than a `uuid` — it references that table by
// foreign key (supabase/migrations/20260916172217_vote_categories.sql), it
// just isn't typed as one. Mirrors domain/entities/vote.ts's
// `VoteCategoryId = string`.
export interface VoteRow {
  id: string
  convocation_id: string
  category_id: string
  voter_id: string
  candidate_id: string
  voted_at: string
}
