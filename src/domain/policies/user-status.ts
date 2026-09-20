// specs/web-users.md §2.1/AC-WU-08 — the account's activation status is a
// DERIVED, two-value predicate, never a stored column: "Actif" only once
// the member has accepted the charter at least once (CDC §3.1, "activation
// après acceptation de la charte"). No public.users.status column exists,
// and none is added by this feature — see that column's own migration
// history (charter_accepted_at, supabase/migrations/20260814080820_charter_acceptance.sql)
// for the RPC (accept_charter()) that is the ONLY writer of this field.
//
// Two values only, not three: §2.1 point 3 — the CDC also names a
// "désactivé" state (PO-WU-05), but it has no column, no control, no
// pastille anywhere in this pass. Adding a third value here would be
// inventing UI for a case this feature deliberately leaves unimplemented.
export type UserStatus = 'invited' | 'active'

export function userStatus(charterAcceptedAt: Date | null): UserStatus {
  return charterAcceptedAt === null ? 'invited' : 'active'
}
