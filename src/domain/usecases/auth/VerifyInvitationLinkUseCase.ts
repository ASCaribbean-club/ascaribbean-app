import type { AuthRepository, InvitationLinkType } from '../../repositories/auth-repository'

export interface VerifyInvitationLinkInput {
  tokenHash: string
  type: InvitationLinkType
}

// specs/web-users-invitation-links.md §5 — ActivationPage's own "Activer
// mon compte" tap. Deliberately thin: no business rule of its own to
// validate before calling out (unlike InviteUserUseCase), just the
// intent/DI seam every other auth action in this codebase already goes
// through — AuthRepositoryImpl is the one place that knows this is a
// supabase.auth.verifyOtp() call.
export class VerifyInvitationLinkUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(input: VerifyInvitationLinkInput): Promise<void> {
    await this.authRepository.verifyInvitationLink(input.tokenHash, input.type)
  }
}
