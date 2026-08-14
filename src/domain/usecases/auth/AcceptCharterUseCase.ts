import type { UserRepository } from '../../repositories/user-repository'

export interface AcceptCharterInput {
  userId: string
}

export class AcceptCharterUseCase {
  private readonly userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  async execute(input: AcceptCharterInput): Promise<void> {
    await this.userRepository.acceptCharter(input.userId)
  }
}
