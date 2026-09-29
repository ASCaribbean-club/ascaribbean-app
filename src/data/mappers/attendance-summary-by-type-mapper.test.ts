import { describe, expect, it } from 'vitest'
import type { AttendanceSummaryByTypeDto } from '../dto/attendance-summary-by-type-dto'
import { toAttendanceTypeBreakdown } from './attendance-summary-by-type-mapper'

describe('toAttendanceTypeBreakdown', () => {
  it('maps snake_case RPC columns to the camelCase entity', () => {
    const dto: AttendanceSummaryByTypeDto = { convocation_type: 'training', validated_count: 8, present_count: 6 }

    expect(toAttendanceTypeBreakdown(dto)).toEqual({ type: 'training', validatedCount: 8, presentCount: 6 })
  })

  it('maps each convocation type independently, without assuming a fixed set or order', () => {
    const dto: AttendanceSummaryByTypeDto = { convocation_type: 'match', validated_count: 3, present_count: 3 }

    expect(toAttendanceTypeBreakdown(dto)).toEqual({ type: 'match', validatedCount: 3, presentCount: 3 })
  })
})
