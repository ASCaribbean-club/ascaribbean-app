// Minimal, Supabase-free session shape — domain/ must never import
// @supabase/supabase-js (CLAUDE.md §3). AuthRepositoryImpl maps the real
// Supabase Session down to this.
export interface AuthSession {
  userId: string
}

// specs/web-users-invitation-links.md §5 — the two `type` values the
// invite-user Edge Function ever builds an /activation URL with (§1.3):
// 'invite' for a brand-new account, 'magiclink' for a re-issued link on an
// existing one. A plain string union defined HERE, not imported from
// @supabase/supabase-js (CLAUDE.md §3) — domain/ knows these two values
// exist and nothing else about how Supabase represents them internally.
export type InvitationLinkType = 'invite' | 'magiclink'

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>
  // Returns an unsubscribe function.
  onSessionChange(callback: (session: AuthSession | null) => void): () => void
  signInWithPassword(email: string, password: string): Promise<void>
  requestMagicLink(email: string): Promise<void>
  requestPasswordReset(email: string): Promise<void>
  // specs/web-users-invitation-links.md §5 — ActivationPage's own "Activer
  // mon compte" tap, never called on load (§1.4/§5 point 1: the token is
  // single-use, a link-preview crawler's GET must never be the thing that
  // consumes it). Exchanges the token_hash for a session — leaves the
  // caller signed in, same as updatePassword below.
  verifyInvitationLink(tokenHash: string, type: InvitationLinkType): Promise<void>
  // True when the current navigation is landing from an invite/recovery
  // email link that Supabase rejected (expired or already used) — the
  // caller never got a session out of it. Lets /update-password tell that
  // case apart from "not logged in, wandered here directly".
  hasRecoveryLinkError(): boolean
  // Used both to set the first password after an invite and to complete a
  // password reset — both leave the caller with an active session and
  // nothing else to distinguish (see docs/CHARTE.md sibling note in
  // UpdatePasswordUseCase).
  updatePassword(newPassword: string): Promise<void>
  signOut(): Promise<void>
}
