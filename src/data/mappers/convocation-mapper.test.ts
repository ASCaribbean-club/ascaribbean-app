import { describe, expect, it } from 'vitest'
import type { ConvocationArrangements } from '@domain/entities/convocation'
import type { ConvocationRow } from '../dto/convocation-dto'
import { toConvocation, toConvocationArrangementsUpdateRow } from './convocation-mapper'

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

// specs/web-localizations.md §2.2/§2.6/AC-WL-11 — the three valid forms.
describe('toConvocation', () => {
  const base: ConvocationRow = {
    id: 'convocation-1',
    team_id: 'team-1',
    type: 'training',
    date: '2026-08-12T15:00:00.000Z',
    location: null,
    training_location_id: null,
    status: 'open',
    closed_at: null,
    closed_by: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    created_by: 'coach-1',
  }

  it('maps a training that references a venue, with the joined name and address', () => {
    const result = toConvocation({
      ...base,
      training_location_id: 'loc-1',
      training_location: { id: 'loc-1', name: 'Terrain A', address: '1 rue du Stade', is_archived: false },
    })

    expect(result.location).toBeNull()
    expect(result.trainingLocation).toEqual({ id: 'loc-1', name: 'Terrain A', address: '1 rue du Stade', isArchived: false })
  })

  it('maps an archived venue as still resolved', () => {
    const result = toConvocation({
      ...base,
      training_location_id: 'loc-1',
      training_location: { id: 'loc-1', name: 'Terrain A', address: '1 rue du Stade', is_archived: true },
    })

    expect(result.trainingLocation?.isArchived).toBe(true)
  })

  it('maps a legacy training / match / meeting with free-text location and no venue', () => {
    const result = toConvocation({ ...base, type: 'match', location: 'Stade adverse', training_location: null })

    expect(result.location).toBe('Stade adverse')
    expect(result.trainingLocation).toBeNull()
  })

  it('maps a row with no embedded join (RPC result) to trainingLocation null', () => {
    expect(toConvocation({ ...base, location: 'Ancien lieu' }).trainingLocation).toBeNull()
  })
})
