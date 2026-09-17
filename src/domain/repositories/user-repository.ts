import type { User } from '../entities/user'

// specs/section-and-teams.md §2.11/PO-ST-12b — minimal shape for the
// `UTILISATEUR` dropdown in AssignCoachDialog: an id and a display name,
// nothing else of the account's own profile. PO-ST-12b (non-blocking,
// position taken here per the task's own instruction): "all users", not
// filtered by charter acceptance or active status — the export shows
// nothing to filter by, and neither concept has a settled definition yet.
// To confirm with the developer/Bureau before this dropdown is final.
export interface UserSummary {
  id: string
  fullName: string
}

export interface UserRepository {
  findById(id: string): Promise<User | null>
  // CDC §3.1 charter-acceptance gate — idempotent, see accept_charter() in
  // supabase/migrations/20260813075127_charter_acceptance.sql.
  acceptCharter(userId: string): Promise<void>

  // specs/section-and-teams.md §2.11/PO-ST-12b — admin-only directory read,
  // backed by the existing users_select_own policy's `or private.is_admin()`
  // branch (no new RLS policy, §2.11). Never called from a non-admin
  // screen — for any other caller RLS silently narrows this to their own
  // single row, same "no existence leak" shape as CoachRepository's admin
  // read.
  findAll(): Promise<UserSummary[]>
}
