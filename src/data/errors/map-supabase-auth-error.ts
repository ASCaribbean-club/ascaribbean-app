import { isAuthWeakPasswordError, type AuthError } from '@supabase/supabase-js'
import { AuthLinkInvalidError } from '@domain/errors/auth-link-invalid-error'
import { DomainError } from '@domain/errors/domain-error'
import { InvalidCredentialsError } from '@domain/errors/invalid-credentials-error'
import { WeakPasswordError } from '@domain/errors/weak-password-error'

// Distinct from map-supabase-error.ts (PostgrestError, table/RPC calls) —
// supabase-js's Auth API raises AuthError instead. Shared by every
// AuthRepositoryImpl method that doesn't need its own dedicated mapping
// (signInWithPassword, updatePassword, signOut) — most of those really do
// only ever fail with
// "wrong credentials", but updatePassword() can ALSO reject with a
// password-policy violation (isAuthWeakPasswordError — GoTrue's own
// dedicated error class for this, not string-matched), which is a
// different failure a caller needs to tell apart: "choose a different
// password" is not the same fix as "retry your email/password".
export function mapSupabaseAuthError(error: AuthError): DomainError {
  if (isAuthWeakPasswordError(error)) {
    return new WeakPasswordError(error.message)
  }
  return new InvalidCredentialsError(error.message)
}

// specs/web-users-invitation-links.md §5 — AuthRepositoryImpl.verifyAuthLink's
// own mapping, distinct from mapSupabaseAuthError above: "wrong password"
// and "this activation/recovery link is expired/already used" need
// different French copy and a different next step (retry the form vs.
// "demandez un nouveau lien"), so this gets its own function rather than
// folding into the generic one and defaulting to InvalidCredentialsError.
export function mapVerifyAuthLinkError(error: AuthError): DomainError {
  return new AuthLinkInvalidError(error.message)
}
