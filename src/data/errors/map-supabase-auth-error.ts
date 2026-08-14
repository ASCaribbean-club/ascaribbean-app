import type { AuthError } from '@supabase/supabase-js'
import { DomainError } from '@domain/errors/domain-error'
import { InvalidCredentialsError } from '@domain/errors/invalid-credentials-error'

// Distinct from map-supabase-error.ts (PostgrestError, table/RPC calls) —
// supabase-js's Auth API raises AuthError instead. InvalidCredentialsError
// is the only auth failure the domain models today (see AuthRepository's
// doc comment), so every AuthError defaults to it: this is only called from
// AuthRepositoryImpl.signInWithPassword, where "wrong email/password" is
// the one realistic failure mode.
export function mapSupabaseAuthError(error: AuthError): DomainError {
  return new InvalidCredentialsError(error.message)
}
