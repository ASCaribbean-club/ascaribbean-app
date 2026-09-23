import { DomainError } from './domain-error'

// specs/web-users-invitation-links.md §2 — ReissueInvitationLinkUseCase's
// own guard: re-issuing a link only makes sense for an account still at
// 'invited' status (userStatus(charterAcceptedAt) === 'invited',
// domain/policies/user-status.ts) — an already-active member has a
// password and a session, nothing to activate. The row action's own
// visibility (rendered only for an 'invited' row) already keeps this
// unreachable from the UI in the normal case; this is the domain-level
// version of that same rule (CLAUDE.md §6, "la policy front n'est jamais
// la sécurité" — the rule has to actually live here too, not only in
// where a button is rendered).
export class InvitationTargetNotInvitedError extends DomainError {}
