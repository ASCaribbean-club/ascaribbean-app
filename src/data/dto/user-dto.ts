import type { Role } from '@domain/entities/user'

// Raw shape of public.users, see supabase/migrations/20260811171754_initial_schema.sql
// and 20260813075127_charter_acceptance.sql.
export interface UserRow {
  id: string
  full_name: string
  email: string
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
