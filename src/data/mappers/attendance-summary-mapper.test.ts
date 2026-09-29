import { describe, expect, it } from 'vitest'
import type { AttendanceSummaryDto } from '../dto/attendance-summary-dto'
import { toAttendanceSummary } from './attendance-summary-mapper'

describe('toAttendanceSummary', () => {
  it('maps snake_case RPC columns to the camelCase entity', () => {
    const dto: AttendanceSummaryDto = { validated_count: 20, present_count: 15 }

    expect(toAttendanceSummary(dto)).toEqual({ validatedCount: 20, presentCount: 15 })
  })

  // AC-PS-17 — the zero-denominator case round-trips as real zeros here;
  // turning that into `null` is the POLICY's job (player-stats-rates.ts),
  // never this mapper's.
  it('maps a zero-denominator row as literal zeros, not null (that translation belongs to the policy layer)', () => {
    const dto: AttendanceSummaryDto = { validated_count: 0, present_count: 0 }

    expect(toAttendanceSummary(dto)).toEqual({ validatedCount: 0, presentCount: 0 })
  })
})
