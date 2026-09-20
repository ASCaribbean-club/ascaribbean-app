import type { SupabaseClient } from '@supabase/supabase-js'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import type { RoleAssignmentRepository } from '@domain/repositories/role-assignment-repository'
import { mapSupabaseError } from '@data/errors/map-supabase-error'
import { toCoachAssignmentInsertRow, toRoleAssignmentInsertRows } from '@data/mappers/role-assignment-mapper'

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

  // specs/web-users.md §2.6/AC-WU-06 — user_roles_insert_assign_role (RLS)
  // — mirrors the new 'role:assign' action. Same idempotent-per-row shape
  // and same reasoning as assignCoachToTeams above (one INSERT per row,
  // sequential, 23505 absorbed) — one row for every role except 'coach',
  // which can produce several (one per team).
  async assignRole(userId: string, assignment: AssignableRoleAssignment): Promise<void> {
    const rows = toRoleAssignmentInsertRows(userId, assignment)

    for (const row of rows) {
      const { error } = await this.client.from('user_roles').insert(row)

      if (error) {
        if (error.code === '23505') continue // already assigned — absorbed, same reasoning as assignCoachToTeams
        throw mapSupabaseError(error)
      }
    }
  }

  // specs/web-users-role-edit-remove.md §2.2/§2.7/AC-WU-48/AC-WU-51 —
  // user_roles_update_assign_role (RLS) — mirrors 'role:assign''s SECOND
  // policy. `currentAssignment`/`nextAssignment` share the same role
  // (EditRoleAssignmentScopeUseCase's own guarantee, §1) — this method
  // switches on `nextAssignment.role` and narrows `currentAssignment` with
  // an `if (currentAssignment.role !== ...) return` guard rather than a
  // type cast: both branches are unreachable in practice (the use case
  // already enforces the roles match), the narrowing is just how TypeScript
  // is told that without an `as`.
  async editRoleAssignmentScope(
    userId: string,
    currentAssignment: AssignableRoleAssignment,
    nextAssignment: AssignableRoleAssignment,
  ): Promise<void> {
    switch (nextAssignment.role) {
      case 'player': {
        if (currentAssignment.role !== 'player') return // unreachable — see this method's own comment
        // §2.2 rule 4/AC-WU-51 — a 23505 here (moving onto a team the same
        // account/role already occupies) is NOT absorbed: mapSupabaseError
        // turns it into DuplicateRoleAssignmentError, surfaced to the admin.
        const { error } = await this.client
          .from('user_roles')
          .update({ team_id: nextAssignment.teamId })
          .eq('user_id', userId)
          .eq('role', 'player')
          .eq('team_id', currentAssignment.teamId)
        if (error) throw mapSupabaseError(error)
        return
      }
      case 'section-manager': {
        if (currentAssignment.role !== 'section-manager') return // unreachable — see this method's own comment
        const { error } = await this.client
          .from('user_roles')
          .update({ section_id: nextAssignment.sectionId })
          .eq('user_id', userId)
          .eq('role', 'section-manager')
          .eq('section_id', currentAssignment.sectionId)
        if (error) throw mapSupabaseError(error)
        return
      }
      case 'coach': {
        if (currentAssignment.role !== 'coach') return // unreachable — see this method's own comment
        // §2.2/§2.7 — whole-set reconciliation: INSERT every newly-checked
        // team, DELETE every unchecked one. Sequential, same reasoning as
        // assignCoachToTeams' own comment (PostgREST's on_conflict can't
        // target a partial index, so per-row 23505 catching is the
        // REST-reachable equivalent of "on conflict do nothing" — but here
        // ONLY on the inserts: §2.2 rule 4 is explicit that this UPDATE
        // path's own conflict (above) must NOT be absorbed the same way).
        const teamsToAdd = nextAssignment.teamIds.filter((teamId) => !currentAssignment.teamIds.includes(teamId))
        const teamsToRemove = currentAssignment.teamIds.filter((teamId) => !nextAssignment.teamIds.includes(teamId))

        for (const teamId of teamsToAdd) {
          const { error } = await this.client.from('user_roles').insert(toCoachAssignmentInsertRow(userId, teamId))
          if (error) {
            if (error.code === '23505') continue // already assigned — absorbed, same reasoning as assignCoachToTeams/assignRole
            throw mapSupabaseError(error)
          }
        }

        if (teamsToRemove.length > 0) {
          // §2.3 — a DELETE never conflicts, so this can be one request
          // rather than sequential per-row calls.
          const { error } = await this.client.from('user_roles').delete().eq('user_id', userId).eq('role', 'coach').in('team_id', teamsToRemove)
          if (error) throw mapSupabaseError(error)
        }
        return
      }
      default:
        // authorized-officer / treasurer / medical-referent / volunteer —
        // §2.2: no scope field exists to edit on these branches at all.
        // Unreached in practice: EditRoleAssignmentDialog renders no
        // "Enregistrer" control for these roles (nothing to submit).
        return
    }
  }

  // specs/web-users-role-edit-remove.md §2.3/§2.7/AC-WU-48/AC-WU-52 —
  // user_roles_delete_remove_role (RLS) — mirrors the new 'role:remove'
  // action. Deletes every row `assignment` describes, and only those.
  async removeRoleAssignment(userId: string, assignment: AssignableRoleAssignment): Promise<void> {
    const query = this.client.from('user_roles').delete().eq('user_id', userId).eq('role', assignment.role)

    const { error } = await (() => {
      switch (assignment.role) {
        case 'player':
          return query.eq('team_id', assignment.teamId)
        case 'coach':
          // §2.3 — "toutes les équipes de cette affectation, et elles
          // seules": every row this coach assignment aggregates, one DELETE.
          return query.in('team_id', assignment.teamIds)
        case 'section-manager':
          return query.eq('section_id', assignment.sectionId)
        default:
          // authorized-officer / treasurer / medical-referent / volunteer —
          // club-wide, the one row this assignment describes has both
          // columns null.
          return query.is('team_id', null).is('section_id', null)
      }
    })()

    if (error) throw mapSupabaseError(error)
  }
}
