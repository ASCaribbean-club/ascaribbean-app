import { DomainError } from './domain-error'

// specs/web-users-role-edit-remove.md §2.2 rule 4/AC-WU-51 — a scope EDIT
// (moving a 'player'/'section-manager' assignment onto a team/section) that
// lands on a team/section the SAME account already holds the SAME role on
// hits one of user_roles' own partial unique indexes
// (user_roles_team_scoped_idx / user_roles_section_scoped_idx, see
// supabase/migrations/20260811171754_initial_schema.sql). Unlike the
// coach-reconciliation INSERT case (still absorbed in silence by
// RoleAssignmentRepositoryImpl, exactly as before this amendment), this one
// must surface as a translated French message — absorbing it would let the
// administrator believe the move happened.
export class DuplicateRoleAssignmentError extends DomainError {}
