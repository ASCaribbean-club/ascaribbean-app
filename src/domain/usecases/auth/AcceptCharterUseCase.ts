import type { UserRepository } from '../../repositories/user-repository'

export interface AcceptCharterInput {
  userId: string
  // Distinct from the charter itself: true = authorises use of the member's
  // image, false = refuses. Refusal never blocks activation.
  imageRightsConsent: boolean
}

export class AcceptCharterUseCase {
  private readonly userRepository: UserRepository

  constructor(userRepository: UserRepository) {
    this.userRepository = userRepository
  }

  async execute(input: AcceptCharterInput): Promise<void> {
    await this.userRepository.acceptCharter(input.userId, input.imageRightsConsent)
  }
}
