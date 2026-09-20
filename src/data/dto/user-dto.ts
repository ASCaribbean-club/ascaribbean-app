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
  // specs/web-memberships.md §2.10/§4 — added for MembershipEditRow's
  // read-only e-mail field (amendement du 2026-09-17).
  email: string
}

// specs/web-users.md §2.2/§2.10 — /admin/users' own table read
// (UserRepositoryImpl.findAdminDirectory()). Narrower than UserRow above:
// this read never needs `position` (§1, "le poste du joueur... ne pas
// l'ajouter" — no column/field of the mockup shows it here).
export interface AdminUserRow {
  id: string
  full_name: string
  email: string
  charter_accepted_at: string | null
}

// One row per public.user_roles assignment, across EVERY account — the
// same 3 columns as UserRoleRow above, plus user_id so
// UserRepositoryImpl.findAdminDirectory() can group them back per account
// (findById()'s own read is already scoped to one user_id via `.eq()`, so
// UserRoleRow itself doesn't need this column).
export interface AdminUserRoleRow extends UserRoleRow {
  user_id: string
}

// specs/web-users.md §2.2/§2.3 — the narrow projection of public.users used
// ONLY by the completeness-facts read (UserRepositoryImpl.findMissingElementFacts()),
// criterion 4 (§2.3). Grouped here rather than in a separate file: it is
// consumed exclusively by UserRepositoryImpl, same "grouped by consumer, not
// strictly by table" precedent this file already sets for UserRoleRow.
export interface UserCharterFactRow {
  id: string
  charter_accepted_at: string | null
}

// specs/web-users.md §2.3, criteria 2/3 — the narrow projection of
// public.memberships (a DIFFERENT table) used only by
// UserRepositoryImpl.findMissingElementFacts(): one row per non-archived
// membership for the current season. Grouped here, not in
// data/dto/membership-dto.ts, because it is consumed exclusively by
// UserRepositoryImpl and shares nothing with MembershipRow's own richer
// shape (no `status`/`valid_until`/`amount_due_cents` — this read cares
// about exactly two things, "does a row exist" and "does it carry a
// licence number").
export interface MembershipCompletenessFactRow {
  user_id: string
  licence_number: string | null
}

// specs/web-users.md §2.3, criterion 1 — the narrowest possible projection
// of public.user_roles for the completeness-facts read: just WHO has at
// least one row, nothing about which role or which scope.
export interface UserRoleOwnerRow {
  user_id: string
}
