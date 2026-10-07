import type { PostgrestError } from '@supabase/supabase-js'
import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { DomainError } from '@domain/errors/domain-error'
import { DuplicateExpenseCategoryError } from '@domain/errors/duplicate-expense-category-error'
import { DuplicateOpeningBalanceError } from '@domain/errors/duplicate-opening-balance-error'
import { InvalidFinanceInputError } from '@domain/errors/invalid-finance-input-error'
import { DuplicateMembershipError } from '@domain/errors/duplicate-membership-error'
import { DuplicateRoleAssignmentError } from '@domain/errors/duplicate-role-assignment-error'
import { ForbiddenError } from '@domain/errors/forbidden-error'
import { InconsistentMatchScoreError } from '@domain/errors/inconsistent-match-score-error'
import { InvalidMatchLineupInputError } from '@domain/errors/invalid-match-lineup-input-error'
import { InvalidMissionTemplateError } from '@domain/errors/invalid-mission-template-error'
import { InvalidRoleScopeError } from '@domain/errors/invalid-role-scope-error'
import { MissionFullError } from '@domain/errors/mission-full-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { TrainingLocationArchivedError } from '@domain/errors/training-location-archived-error'
import { OverlappingSeasonError } from '@domain/errors/overlapping-season-error'

// Traduit une erreur Postgres/PostgREST en erreur de domaine — le point qui
// empêche un code d'erreur Postgres de remonter jusqu'à un composant.
// Codes PostgREST : https://postgrest.org/en/stable/references/errors.html
export function mapSupabaseError(error: PostgrestError): DomainError {
  switch (error.code) {
    case 'PGRST116':
      return new NotFoundError(error.message)
    case '42501':
      // specs/web-create-convocation.md AC-WC-23 — the update_*_convocation
      // RPCs raise this when the row is no longer in the admin edit window
      // (past or not 'open'): a business-rule window, not a missing right.
      if (error.message.includes('convocation_not_editable')) {
        return new ConvocationNotEditableError(error.message)
      }
      // specs/match-details-missions.md R2/AC-MM-15 — claim_mission refuses a
      // registration beyond the mission's capacity with this dedicated token.
      // Checked BEFORE the generic ForbiddenError fallback, on the message
      // token only (never the table name).
      if (error.message.includes('mission_full')) {
        return new MissionFullError(error.message)
      }
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
      // specs/match-stats.md — two named backstops, added alongside the
      // branch above rather than replacing its own `NotFoundError` fallback
      // for any OTHER, still-unnamed 23514 violation (CLAUDE.md's "add
      // named branches, don't override the existing blanket/other
      // mappings"). Both should only ever fire from a bug bypassing
      // RecordMatchScoreUseCase/AddMatchEventUseCase — those use cases
      // already reject the same two situations from domain/ before any
      // network call (AC-MS-05/AC-MS-16); this is the defense-in-depth
      // translation if a check constraint fires anyway (see
      // supabase/migrations/20260924100000_match_statistics_schema.sql).
      if (error.message.includes('match_details_goals_both_or_none_check')) {
        return new InconsistentMatchScoreError(error.message)
      }
      if (error.message.includes('match_events_penalty_requires_goal_check')) {
        return new InconsistentMatchScoreError(error.message)
      }
      // specs/web-localizations.md §2.3/AC-WL-06 — the BEFORE INSERT trigger on
      // convocations (convocations_training_location_not_archived) refuses a
      // training that references an archived venue, via function or direct
      // insert. See supabase/migrations/20261001100000_web_localizations.sql.
      if (error.message.includes('training_location_archived')) {
        return new TrainingLocationArchivedError(error.message)
      }
      // specs/web-mission-templates.md §2.3 — check constraints of
      // public.mission_templates (label, capacity, type): never raw Postgres text.
      // specs/mob-treasurer-finances.md — check constraints of the finance
      // tables (amounts, labels, payment method, dates): never raw Postgres text.
      if (/(expenses|opening_balances|expense_categories|treasury_checkpoint)/.test(error.message)) {
        return new InvalidFinanceInputError(error.message)
      }
      if (error.message.includes('mission_templates')) {
        return new InvalidMissionTemplateError(error.message)
      }
      // specs/coach-match-composition.md AC-MC-07 — the trigger on
      // match_lineup_slots refuses a player who is not convoked. Backstop only:
      // SaveMatchLineupUseCase rejects the same case before any network call.
      if (error.message.includes('match_lineup_player_not_convoked')) {
        return new InvalidMatchLineupInputError(error.message)
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
      // specs/mob-treasurer-finances.md AC-FI-13/AC-FI-28 — backstops of the
      // use cases' own checks (supabase/migrations/20261007081032_finances.sql).
      if (error.message.includes('expense_categories_label_key_unique')) {
        return new DuplicateExpenseCategoryError(error.message)
      }
      if (error.message.includes('opening_balances_carrier_season_unique')) {
        return new DuplicateOpeningBalanceError(error.message)
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
      // AC-MC-07 — duplicate player / duplicate slot (unique constraints of
      // match_lineup_slots). Backstop, same as above.
      if (error.message.includes('match_lineup_slots')) {
        return new InvalidMatchLineupInputError(error.message)
      }
      return new NotFoundError(error.message)
    default:
      return new NotFoundError(error.message)
  }
}
