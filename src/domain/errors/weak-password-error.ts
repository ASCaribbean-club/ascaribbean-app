import { DomainError } from './domain-error'

// data/errors/map-supabase-auth-error.ts — AuthRepositoryImpl.updatePassword()'s
// own rejection when the chosen password doesn't meet the hosted project's
// password policy (Dashboard > Authentication > Providers > Email >
// Password Requirements). Distinct from InvalidCredentialsError: that one
// means "wrong email/password at sign-in", this one fires on
// /activation and /update-password's own password FORM, a different
// screen and a different fix (choose a different password, not retry the
// same one).
export class WeakPasswordError extends DomainError {}
