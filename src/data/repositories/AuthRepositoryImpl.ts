import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthLinkType, AuthRepository, AuthSession } from '@domain/repositories/auth-repository'
import { mapSupabaseAuthError, mapVerifyAuthLinkError } from '../errors/map-supabase-auth-error'

export class AuthRepositoryImpl implements AuthRepository {
  private readonly client: SupabaseClient

  constructor(client: SupabaseClient) {
    this.client = client
  }

  async getSession(): Promise<AuthSession | null> {
    const { data } = await this.client.auth.getSession()
    return data.session ? { userId: data.session.user.id } : null
  }

  onSessionChange(callback: (session: AuthSession | null) => void): () => void {
    const { data } = this.client.auth.onAuthStateChange((_event, session) => {
      callback(session ? { userId: session.user.id } : null)
    })
    return () => data.subscription.unsubscribe()
  }

  async signInWithPassword(email: string, password: string): Promise<void> {
    const { error } = await this.client.auth.signInWithPassword({ email, password })
    if (error) throw mapSupabaseAuthError(error)
  }

  // specs/web-users-invitation-links.md §5 — ActivationPage's "Activer mon
  // compte" tap and UpdatePasswordPage's "Réinitialiser mon mot de passe"
  // tap, both PKCE-style token exchange on an explicit user action — never
  // the implicit-flow action_link that getSession()/onAuthStateChange would
  // auto-detect from the URL on page load. Every link this method ever
  // consumes (invite/magiclink/recovery alike) is built by the invite-user
  // Edge Function from a bare token_hash, manually shared by an admin
  // (InviteUserDialog) — never Supabase's own action_link/mailer.
  async verifyAuthLink(tokenHash: string, type: AuthLinkType): Promise<void> {
    const { error } = await this.client.auth.verifyOtp({ token_hash: tokenHash, type })
    if (error) throw mapVerifyAuthLinkError(error)
  }

  async updatePassword(newPassword: string): Promise<void> {
    const { error } = await this.client.auth.updateUser({ password: newPassword })
    if (error) throw mapSupabaseAuthError(error)
  }

  async signOut(): Promise<void> {
    const { error } = await this.client.auth.signOut()
    if (error) throw mapSupabaseAuthError(error)
  }
}
