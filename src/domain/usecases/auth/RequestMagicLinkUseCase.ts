import type { AuthRepository } from '../../repositories/auth-repository'

export interface RequestMagicLinkInput {
  email: string
}

export class RequestMagicLinkUseCase {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(input: RequestMagicLinkInput): Promise<void> {
    await this.authRepository.requestMagicLink(input.email)
  }
}
