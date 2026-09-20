import { DomainError } from './domain-error'

// specs/web-users.md §2.6c/AC-WU-35 — thrown by AssignRoleUseCase, from the
// domain and before any network call, when userId is missing or the
// role-specific scope (a team for 'player', at least one team for 'coach',
// a section for 'section-manager') is missing. The database's own
// user_roles_scope_check CHECK constraint is the real, non-bypassable
// guarantee (§2.6c) — this error is the earlier, friendlier rejection the
// spec asks for, not a substitute for it.
export class InvalidRoleAssignmentInputError extends DomainError {}
