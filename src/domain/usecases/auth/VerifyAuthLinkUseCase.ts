import type { AuthLinkType, AuthRepository } from '../../repositories/auth-repository'

export interface VerifyAuthLinkInput {
  tokenHash: string
  type: AuthLinkType
}

// specs/web-users-invitation-links.md §5 — the tap on ActivationPage's
// "Activer mon compte" or UpdatePasswordPage's "Réinitialiser mon mot de
// passe". Deliberately thin: no business rule of its own to validate before
// calling out (unlike InviteUserUseCase), just the intent/DI seam every
// other auth action in this codebase already goes through —
// AuthRepositoryImpl is the one place that knows this is a
// supabase.auth.verifyOtp() call.
export class VerifyAuthLinkUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(input: VerifyAuthLinkInput): Promise<void> {
    await this.authRepository.verifyAuthLink(input.tokenHash, input.type)
  }
}
