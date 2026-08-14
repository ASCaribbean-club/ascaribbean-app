import type { AuthRepository } from '../../repositories/auth-repository'

export class SignOutUseCase {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(): Promise<void> {
    await this.authRepository.signOut()
  }
}
