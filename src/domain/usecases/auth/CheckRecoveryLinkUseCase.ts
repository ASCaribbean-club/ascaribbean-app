import type { AuthRepository } from '../../repositories/auth-repository'

export class CheckRecoveryLinkUseCase {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  execute(): boolean {
    return this.authRepository.hasRecoveryLinkError()
  }
}
