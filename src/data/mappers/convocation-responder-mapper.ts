import type { PlayerPosition } from '@domain/entities/user'
import type { ConvocationResponderStatus, ConvocationTeamPlayer } from '@domain/repositories/convocation-responders-repository'
import type { ConvocationResponderDto, ConvocationTeamPlayerDto } from '../dto/convocation-responder-dto'

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

export const ConvocationTeamPlayerMapper = {
  toDomain(dto: ConvocationTeamPlayerDto): ConvocationTeamPlayer {
    return {
      userId: dto.user_id,
      displayName: dto.display_name,
      position: dto.position as PlayerPosition | null,
    }
  },
}
