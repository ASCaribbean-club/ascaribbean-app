import { describe, expect, it } from 'vitest'
import type { ConvocationArrangements } from '@domain/entities/convocation'
import { toConvocationArrangementsUpdateRow } from './convocation-mapper'

// specs/edit-match-details.md, developer decision (2026-09-25) — the narrow
// update mapper: exactly 2 columns, never status/type/team_id, even though
// the input entity carries no such fields here to accidentally leak.
describe('toConvocationArrangementsUpdateRow', () => {
  it('maps arrangements to exactly the 2 writable columns', () => {
    const arrangements: ConvocationArrangements = {
      date: '2026-08-12T15:00:00.000Z',
      location: 'Nouveau stade',
    }

    expect(toConvocationArrangementsUpdateRow(arrangements)).toEqual({
      date: '2026-08-12T15:00:00.000Z',
      location: 'Nouveau stade',
    })
  })

  it('never includes a status/type/team_id key on the mapped row', () => {
    const mapped = toConvocationArrangementsUpdateRow({
      date: '2026-08-12T15:00:00.000Z',
      location: 'Nouveau stade',
    })

    expect(Object.keys(mapped).sort()).toEqual(['date', 'location'])
  })
})
