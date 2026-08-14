import type { AuthRepository } from '../../repositories/auth-repository'

export interface RequestPasswordResetInput {
  email: string
}

export class RequestPasswordResetUseCase {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(input: RequestPasswordResetInput): Promise<void> {
    await this.authRepository.requestPasswordReset(input.email)
  }
}
