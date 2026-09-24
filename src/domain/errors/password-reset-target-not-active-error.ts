import { DomainError } from './domain-error'

// specs/web-users-invitation-links.md §2 — GeneratePasswordResetLinkUseCase's
// own guard, the mirror image of InvitationTargetNotInvitedError: a
// password-reset link only makes sense for an account at 'active' status
// (userStatus(charterAcceptedAt) === 'active', domain/policies/user-status.ts)
// — an account still 'invited' has no password yet, it needs an activation
// link (InviteUserDialog's 'reissue' mode), not a reset one. The row
// action's own visibility (rendered only for an 'active' row) already keeps
// this unreachable from the UI in the normal case; this is the domain-level
// version of that same rule (CLAUDE.md §6).
export class PasswordResetTargetNotActiveError extends DomainError {}
