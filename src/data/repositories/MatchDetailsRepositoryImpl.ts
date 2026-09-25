import type { SupabaseClient } from '@supabase/supabase-js'
import type { MatchArrangements, MatchDetails } from '@domain/entities/match-details'
import type { MatchDetailsRepository } from '@domain/repositories/match-details-repository'
import type { MatchDetailsRow } from '@data/dto/match-details-dto'
import { toMatchArrangementsUpdateRow, toMatchDetails, toMatchDetailsRow } from '@data/mappers/match-details-mapper'
import { mapSupabaseError } from '@data/errors/map-supabase-error'

// `public.match_details` — migration
// 20260821091519_convocation_creation_schema.sql (see match-details-dto.ts).
export class MatchDetailsRepositoryImpl implements MatchDetailsRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async upsert(details: MatchDetails): Promise<MatchDetails> {
    // CLAUDE.md §6, "current state" table, not append-only — upsert on
    // `convocation_id` (the primary key), same convention as
    // MeetingDetailsRepositoryImpl.
    const { data, error } = await this.client
      .from('match_details')
      .upsert(toMatchDetailsRow(details), { onConflict: 'convocation_id' })
      .select()
      .single()

    if (error) throw mapSupabaseError(error)

    return toMatchDetails(data as MatchDetailsRow)
  }

  async findByConvocationId(convocationId: string): Promise<MatchDetails | null> {
    // `.maybeSingle()`, not `.single()` — a match convocation with no
    // MatchDetails row yet (shouldn't normally happen once creation is
    // wired, but this repository must not throw on it) is a valid `null`.
    const { data, error } = await this.client
      .from('match_details')
      .select('convocation_id, opponent_id, is_home, meeting_point_time, meeting_point_location, goals_for, goals_against')
      .eq('convocation_id', convocationId)
      .maybeSingle()

    if (error) throw mapSupabaseError(error)
    if (!data) return null

    return toMatchDetails(data as MatchDetailsRow)
  }

  // specs/match-stats.md MS-01/MS-10 — RecordMatchScoreUseCase's own write
  // path. `.update`, not `.upsert` above — a coach recording a result must
  // only ever touch an EXISTING match_details row (the convocation already
  // created it), and this call deliberately writes ONLY the score columns,
  // never opponent_id/is_home/meeting_point_* (see this method's own
  // comment on domain/repositories/match-details-repository.ts). RLS's
  // match_details_update_record_score is the real authorization boundary.
  async recordScore(convocationId: string, goalsFor: number, goalsAgainst: number): Promise<MatchDetails> {
    const { data, error } = await this.client
      .from('match_details')
      .update({ goals_for: goalsFor, goals_against: goalsAgainst })
      .eq('convocation_id', convocationId)
      .select('convocation_id, opponent_id, is_home, meeting_point_time, meeting_point_location, goals_for, goals_against')
      .single()

    if (error) throw mapSupabaseError(error)

    return toMatchDetails(data as MatchDetailsRow)
  }

  // specs/edit-match-details.md §5/§6 — a plain `.update()`, never
  // `.upsert()`: an upsert on a missing row would silently CREATE an
  // incomplete match_details row for a convocation that may not even be a
  // match (AC-EM-11) — UpdateMatchDetailsUseCase already guarantees the row
  // exists before this is ever called, so a 0-row result here can only mean
  // the RLS window closed underneath the caller (match_details_update_arrangements,
  // §6 — `using`/`with check` on the parent convocation's date/status), not
  // "create it instead". `grant update (is_home, meeting_point_time,
  // meeting_point_location)` (same migration) is the column-level backstop
  // that makes opponent_id structurally unwritable through this call even
  // from a forged request — this mapper/method never even has the chance to
  // include it (MatchArrangements is a Pick<>, §5). Select list includes
  // goals_for/goals_against too (match-stats columns) so the returned
  // MatchDetails is always the full row, not a partially-undefined one.
  async updateArrangements(convocationId: string, arrangements: MatchArrangements): Promise<MatchDetails> {
    const { data, error } = await this.client
      .from('match_details')
      .update(toMatchArrangementsUpdateRow(arrangements))
      .eq('convocation_id', convocationId)
      .select('convocation_id, opponent_id, is_home, meeting_point_time, meeting_point_location, goals_for, goals_against')
      .single()

    if (error) throw mapSupabaseError(error)

    return toMatchDetails(data as MatchDetailsRow)
  }
}