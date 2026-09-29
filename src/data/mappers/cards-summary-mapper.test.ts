import { describe, expect, it } from 'vitest'
import type { CardsSummaryDto } from '../dto/cards-summary-dto'
import { toCardsSummary } from './cards-summary-mapper'

describe('toCardsSummary', () => {
  it('maps snake_case RPC columns to the camelCase entity', () => {
    const dto: CardsSummaryDto = { yellow_count: 2, red_count: 1 }

    expect(toCardsSummary(dto)).toEqual({ yellowCount: 2, redCount: 1 })
  })

  it('maps a zero-card row as literal zeros', () => {
    const dto: CardsSummaryDto = { yellow_count: 0, red_count: 0 }

    expect(toCardsSummary(dto)).toEqual({ yellowCount: 0, redCount: 0 })
  })
})
