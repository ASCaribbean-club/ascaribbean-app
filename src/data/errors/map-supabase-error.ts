import type { PostgrestError } from '@supabase/supabase-js'
import { DomainError } from '@domain/errors/domain-error'
import { DuplicateMembershipError } from '@domain/errors/duplicate-membership-error'
import { DuplicateRoleAssignmentError } from '@domain/errors/duplicate-role-assignment-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InvalidRoleScopeError } from '@domain/errors/invalid-role-scope-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { OverlappingSeasonError } from '@domain/errors/overlapping-season-error'

// Traduit une erreur Postgres/PostgREST en erreur de domaine — le point qui
// empêche un code d'erreur Postgres de remonter jusqu'à un composant.
// Codes PostgREST : https://postgrest.org/en/stable/references/errors.html
export function mapSupabaseError(error: PostgrestError): DomainError {
  switch (error.code) {
    case 'PGRST116':
      return new NotFoundError(error.message)
    case '42501':
      return new ForbiddenError(error.message)
    case '23514':
      // check_violation on user_roles_scope_check means the caller tried to
      // insert/update a role assignment with a team_id/section_id combination
      // that doesn't match the role. This should only ever happen from a bug
      // in the role-assignment use case, never in normal operation — if this
      // starts firing in practice, check the scope matrix documented above
      // RoleAssignment in domain/entities/user.ts and the matching constraint
      // in supabase/migrations/20260811171754_initial_schema.sql.
      if (error.message.includes('user_roles_scope_check')) {
        return new InvalidRoleScopeError(error.message)
      }
      return new NotFoundError(error.message)
    case '23P01':
      // exclusion_violation on seasons_no_overlap means the caller tried to
      // insert/update a season whose date range overlaps an existing one —
      // see the seasons_no_overlap constraint in
      // supabase/migrations/20260819153918_season_scoping_correction.sql.
      return new OverlappingSeasonError(error.message)
    case '23505':
      // unique_violation on memberships_user_season_active_idx means the
      // caller tried to create a SECOND live membership for a
      // (user_id, season_id) pair that already has one — see
      // supabase/migrations/20260917174652_web_memberships_write_policies.sql,
      // AC-WM-07.
      if (error.message.includes('memberships_user_season_active_idx')) {
        return new DuplicateMembershipError(error.message)
      }
      // specs/web-users-role-edit-remove.md §2.2 rule 4/AC-WU-51 — a scope
      // edit landing on a team/section the same account already holds the
      // same role on. Surfaced here, never absorbed — unlike the
      // coach-reconciliation INSERT case, which RoleAssignmentRepositoryImpl
      // still catches its own 23505 directly and never lets reach this
      // function (see that class's own comment on why).
      if (error.message.includes('user_roles_team_scoped_idx') || error.message.includes('user_roles_section_scoped_idx')) {
        return new DuplicateRoleAssignmentError(error.message)
      }
      return new NotFoundError(error.message)
    default:
      return new NotFoundError(error.message)
  }
}
