import type { SupabaseClient } from '@supabase/supabase-js'
import type { RoleAssignmentRepository } from '@domain/repositories/role-assignment-repository'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toCoachAssignmentInsertRow } from '@data/mappers/role-assignment-mapper'

// user_roles_insert_assign_coach (RLS) — mirrors 'role:assign-coach'. First
// write path ever onto public.user_roles (§2.9).
export class RoleAssignmentRepositoryImpl implements RoleAssignmentRepository {
  constructor(private readonly client: SupabaseClient) {}

  // §2.10/AC-ST-36 — one INSERT per team, sequentially, rather than a
  // single multi-row `.upsert(rows, { onConflict, ignoreDuplicates: true })`
  // call: user_roles' relevant unique index (user_roles_team_scoped_idx) is
  // PARTIAL (`where team_id is not null`, supabase/migrations/
  // 20260811171754_initial_schema.sql), and Postgres only infers a conflict
  // target against a partial index when the ON CONFLICT clause repeats that
  // exact predicate — something PostgREST's `on_conflict` query parameter
  // has no way to express (it only accepts a bare column list). A bulk
  // upsert through the REST API would therefore fail with "there is no
  // unique or exclusion constraint matching the ON CONFLICT specification"
  // the first time it actually hit a real conflict. Catching Postgres'
  // unique_violation (23505) per row and treating it as an absorbed
  // duplicate is the REST-reachable equivalent of "on conflict do nothing"
  // the spec describes (§2.10) — not a workaround, the correct shape given
  // this constraint. Sequential (not Promise.all): keeps failure isolated
  // to the row that failed and avoids firing N concurrent writes for what
  // is, at club scale, always a short list of teams.
  async assignCoachToTeams(userId: string, teamIds: string[]): Promise<void> {
    for (const teamId of teamIds) {
      const { error } = await this.client.from('user_roles').insert(toCoachAssignmentInsertRow(userId, teamId))

      if (error) {
        if (error.code === '23505') continue // already assigned — absorbed, not an error (§2.10/AC-ST-36)
        throw mapSupabaseError(error)
      }
    }
  }
}
