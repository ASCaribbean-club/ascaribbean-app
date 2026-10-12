import type { ResponseCounts } from '@domain/rules/convocation-rules'
import type { ConvocationResponseCountsDto } from '../dto/convocation-response-counts-dto'

export const ConvocationResponseCountsMapper = {
  toDomain(dto: ConvocationResponseCountsDto): ResponseCounts {
    return { present: dto.present_count, absent: dto.absent_count, pending: dto.pending_count }
  },
}
