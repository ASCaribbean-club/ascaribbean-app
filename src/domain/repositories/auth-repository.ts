// Minimal, Supabase-free session shape — domain/ must never import
// @supabase/supabase-js (CLAUDE.md §3). AuthRepositoryImpl maps the real
// Supabase Session down to this.
export interface AuthSession {
  userId: string
}

// specs/web-users-invitation-links.md §5 — the `type` values ActivationPage
// and UpdatePasswordPage exchange a token_hash for a session with: 'invite'
// for a brand-new account, 'magiclink' for a re-issued activation link,
// 'recovery' for a password-reset link — all three built by the
// invite-user Edge Function (§1.3), never by Supabase's own
// resetPasswordForEmail()/action_link (see
// UserRepository.generatePasswordResetLink's own comment: password reset is
// admin-mediated, same manual-delivery channel as invitations — the
// application itself never sends email, CLAUDE.md §7 "no service_role key
// reachable client-side" applies the same way here as for invite/magiclink).
// A plain string union defined HERE, not imported from @supabase/supabase-js
// (CLAUDE.md §3) — domain/ knows these three values exist and nothing else
// about how Supabase represents them internally.
export type AuthLinkType = 'invite' | 'magiclink' | 'recovery'

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>
  // Returns an unsubscribe function.
  onSessionChange(callback: (session: AuthSession | null) => void): () => void
  signInWithPassword(email: string, password: string): Promise<void>
  // specs/web-users-invitation-links.md §5 — ActivationPage's "Activer mon
  // compte" tap and UpdatePasswordPage's "Réinitialiser mon mot de passe"
  // tap, never called on load (§1.4/§5 point 1: the token is single-use, a
  // link-preview crawler's GET must never be the thing that consumes it).
  // Exchanges the token_hash for a session — leaves the caller signed in,
  // same as updatePassword below.
  verifyAuthLink(tokenHash: string, type: AuthLinkType): Promise<void>
  // Used both to set the first password after an invite and to complete a
  // password reset — both leave the caller with an active session and
  // nothing else to distinguish (see docs/CHARTE.md sibling note in
  // UpdatePasswordUseCase).
  updatePassword(newPassword: string): Promise<void>
  signOut(): Promise<void>
}
