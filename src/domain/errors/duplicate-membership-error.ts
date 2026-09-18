import { DomainError } from './domain-error'

// specs/web-memberships.md §2.7/AC-WM-07 — surfaces from
// memberships_user_season_active_idx (the partial unique index on
// (user_id, season_id) where archived_at is null), via
// data/errors/map-supabase-error.ts. Fires when an admin tries to create a
// SECOND live membership for a (user, season) pair that already has one —
// a genuine attempt at a duplicate, not the renewal (different season) or
// recreate-after-archive (§2.7) paths, both of which are handled without
// ever reaching the database constraint.
export class DuplicateMembershipError extends DomainError {}
