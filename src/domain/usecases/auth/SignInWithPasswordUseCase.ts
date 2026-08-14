import type { AuthRepository } from '../../repositories/auth-repository'

export interface SignInWithPasswordInput {
  email: string
  password: string
}

export class SignInWithPasswordUseCase {
  private readonly authRepository: AuthRepository

  constructor(authRepository: AuthRepository) {
    this.authRepository = authRepository
  }

  async execute(input: SignInWithPasswordInput): Promise<void> {
    await this.authRepository.signInWithPassword(input.email, input.password)
  }
}
