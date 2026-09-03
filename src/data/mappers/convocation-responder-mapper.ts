import type { PlayerPosition } from '@domain/entities/user'
import type { ConvocationResponderStatus } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationResponderDto } from '../dto/convocation-responder-dto'

export const ConvocationResponderMapper = {
  toDomain(dto: ConvocationResponderDto): ConvocationResponderStatus {
    return {
      userId: dto.user_id,
      hasResponded: dto.has_responded,
      displayName: dto.display_name,
      position: dto.position as PlayerPosition | null,
    }
  },
}
