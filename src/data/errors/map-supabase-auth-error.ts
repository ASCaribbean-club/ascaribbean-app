import type { AuthError } from '@supabase/supabase-js'
import { DomainError } from '@domain/errors/domain-error'
import { InvalidCredentialsError } from '@domain/errors/invalid-credentials-error'
import { InvitationLinkInvalidError } from '@domain/errors/invitation-link-invalid-error'

// Distinct from map-supabase-error.ts (PostgrestError, table/RPC calls) —
// supabase-js's Auth API raises AuthError instead. InvalidCredentialsError
// is the only auth failure the domain models today (see AuthRepository's
// doc comment), so every AuthError defaults to it: this is only called from
// AuthRepositoryImpl.signInWithPassword, where "wrong email/password" is
// the one realistic failure mode.
export function mapSupabaseAuthError(error: AuthError): DomainError {
  return new InvalidCredentialsError(error.message)
}

// specs/web-users-invitation-links.md §5 — AuthRepositoryImpl.verifyInvitationLink's
// own mapping, distinct from mapSupabaseAuthError above: "wrong password"
// and "this activation link is expired/already used" need different French
// copy and a different next step (retry the form vs. "demandez un nouveau
// lien à un administrateur"), so this gets its own function rather than
// folding into the generic one and defaulting to InvalidCredentialsError.
export function mapVerifyInvitationLinkError(error: AuthError): DomainError {
  return new InvitationLinkInvalidError(error.message)
}
