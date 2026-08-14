// Minimal, Supabase-free session shape — domain/ must never import
// @supabase/supabase-js (CLAUDE.md §3). AuthRepositoryImpl maps the real
// Supabase Session down to this.
export interface AuthSession {
  userId: string
}

export interface AuthRepository {
  getSession(): Promise<AuthSession | null>
  // Returns an unsubscribe function.
  onSessionChange(callback: (session: AuthSession | null) => void): () => void
  signInWithPassword(email: string, password: string): Promise<void>
  requestMagicLink(email: string): Promise<void>
  requestPasswordReset(email: string): Promise<void>
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
