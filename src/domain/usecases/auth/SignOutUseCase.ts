import type { AuthRepository } from '../../repositories/auth-repository'

// specs/mob-notifications.md AC-NT-07 — signing out does NOT touch the device
// push subscription ("one phone = one user"): notifications keep arriving, and
// the next sign-in re-syncs the subscription silently (AC-NT-37).
export class SignOutUseCase {
  constructor(private readonly authRepository: AuthRepository) {}

  async execute(): Promise<void> {
    await this.authRepository.signOut()
  }
}
