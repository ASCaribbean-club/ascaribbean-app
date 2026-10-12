import { describe, expect, it } from 'vitest'
import { ConvocationResponseCountsMapper } from './convocation-response-counts-mapper'

describe('ConvocationResponseCountsMapper', () => {
  it('maps snake_case counts to ResponseCounts', () => {
    expect(
      ConvocationResponseCountsMapper.toDomain({ convocation_id: 'c1', present_count: 5, absent_count: 2, pending_count: 3 }),
    ).toEqual({ present: 5, absent: 2, pending: 3 })
  })
})
