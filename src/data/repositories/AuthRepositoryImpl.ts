import type { SupabaseClient } from '@supabase/supabase-js'
import type { AuthRepository, AuthSession } from '@domain/repositories/auth-repository'
import { mapSupabaseAuthError } from '../errors/map-supabase-auth-error'

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

  async requestMagicLink(email: string): Promise<void> {
    const { error } = await this.client.auth.signInWithOtp({ email })
    if (error) throw mapSupabaseAuthError(error)
  }

  async requestPasswordReset(email: string): Promise<void> {
    const { error } = await this.client.auth.resetPasswordForEmail(email)
    if (error) throw mapSupabaseAuthError(error)
  }

  hasRecoveryLinkError(): boolean {
    // Supabase redirects a rejected invite/recovery link back with the
    // failure in the URL instead of raising a JS error — hash fragment for
    // the implicit flow, query string for PKCE. No session ever gets
    // created, so this is the only signal available.
    const hashParams = new URLSearchParams(window.location.hash.replace(/^#/, ''))
    const queryParams = new URLSearchParams(window.location.search)
    return hashParams.get('error_code') === 'otp_expired' || queryParams.get('error_code') === 'otp_expired'
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
