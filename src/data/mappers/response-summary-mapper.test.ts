import { describe, expect, it } from 'vitest'
import type { ResponseSummaryDto } from '../dto/response-summary-dto'
import { toResponseSummary } from './response-summary-mapper'

describe('toResponseSummary', () => {
  it('maps snake_case RPC columns to the camelCase entity', () => {
    const dto: ResponseSummaryDto = { convocated_count: 20, responded_count: 18 }

    expect(toResponseSummary(dto)).toEqual({ convocatedCount: 20, respondedCount: 18 })
  })

  it('maps a zero-denominator row as literal zeros, not null (that translation belongs to the policy layer)', () => {
    const dto: ResponseSummaryDto = { convocated_count: 0, responded_count: 0 }

    expect(toResponseSummary(dto)).toEqual({ convocatedCount: 0, respondedCount: 0 })
  })
})
