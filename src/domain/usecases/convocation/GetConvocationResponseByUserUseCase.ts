import type { ConvocationResponse } from '../../entities/convocation'
import type { ConvocationResponseRepository } from '../../repositories/convocation-response-repository'

export class GetConvocationResponseByUserUseCase {
  constructor(
    private readonly convocationResponseRepository: ConvocationResponseRepository,
  ) { }

  async execute(convocationId: string, userId: string): Promise<ConvocationResponse | null> {
    return this.convocationResponseRepository.findByConvocationAndUser(convocationId, userId)
  }
}
