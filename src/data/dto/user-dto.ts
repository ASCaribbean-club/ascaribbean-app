import type { Role } from '@domain/entities/user'

// Raw shape of public.users, see supabase/migrations/20260811171754_initial_schema.sql,
// 20260813075127_charter_acceptance.sql and 20260901125851_user_player_position.sql.
export interface UserRow {
  id: string
  full_name: string
  email: string
  // CHECK-constrained to the same four values as domain's PlayerPosition —
  // null for non-players and for a player with no position set yet.
  position: string | null
  charter_accepted_at: string | null
}

// Raw shape of one public.user_roles row. `role` reuses the domain Role
// union rather than `string` — it's constrained to the same values by the
// table's CHECK constraint, so this isn't a domain/data coupling, just
// avoiding a redundant string literal type.
export interface UserRoleRow {
  role: Role
  team_id: string | null
  section_id: string | null
}

// specs/section-and-teams.md §2.11/PO-ST-12b — minimal projection of
// public.users backing UserRepositoryImpl.findAll(), the AssignCoachDialog's
// `UTILISATEUR` dropdown. Narrower select than UserRow above: this read
// never needs position/charter_accepted_at (PO-ST-12b leaves what the list
// should be filtered by open, "all users" is the position taken here).
export interface UserSummaryRow {
  id: string
  full_name: string
}
