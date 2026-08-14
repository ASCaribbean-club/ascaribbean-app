import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'

export interface GetCurrentUserInput {
  userId: string
}

// Thin on purpose: the seam exists so a future "deactivated account" check
// (CDC §3.1) has one place to live instead of being added to AuthProvider.
export class GetCurrentUserUseCase {
  private readonly userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  async execute(input: GetCurrentUserInput): Promise<User | null> {
    return this.userRepository.findById(input.userId)
  }
}
