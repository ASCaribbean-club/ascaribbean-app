import { DomainError } from './domain-error'

// specs/web-users-invitation-links.md §5 — ActivationPage's or
// UpdatePasswordPage's own verifyOtp() call rejected the token_hash:
// expired, already used, or malformed. Distinct from InvalidCredentialsError
// (AuthRepository's existing catch-all for signInWithPassword failures,
// mapSupabaseAuthError's own comment) — a wrong password and a dead
// activation/recovery link need different French copy and different next
// steps (retry the form vs. "demandez un nouveau lien").
export class AuthLinkInvalidError extends DomainError {}
