import type { AuthRepository } from '../../repositories/auth-repository'

export interface UpdatePasswordInput {
  newPassword: string
}

// Covers both "set your first password after an invite" and "complete a
// password reset" — both leave the caller with an active session and no
// other distinguishing state, so one use case handles both (see
// AuthRepository.updatePassword's doc comment).
export class UpdatePasswordUseCase {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(input: UpdatePasswordInput): Promise<void> {
    await this.authRepository.updatePassword(input.newPassword)
  }
}
