import { describe, expect, it } from 'vitest'
import type { MatchEvent } from '@domain/entities/match-event'
import type { MatchEventRow } from '../dto/match-event-dto'
import { toMatchEvent, toMatchEventInsertRow } from './match-event-mapper'

describe('match-event-mapper', () => {
  it('maps an ordinary goal row to a domain entity', () => {
    const row: MatchEventRow = {
      id: 'event-1',
      convocation_id: 'c1',
      user_id: 'player-1',
      event_type: 'goal',
      is_penalty: false,
      created_by: 'coach-1',
      created_at: '2026-09-24T18:30:00.000Z',
    }

    expect(toMatchEvent(row)).toEqual({
      id: 'event-1',
      convocationId: 'c1',
      userId: 'player-1',
      eventType: 'goal',
      isPenalty: false,
      createdBy: 'coach-1',
      createdAt: '2026-09-24T18:30:00.000Z',
    })
  })

  it('maps a penalty goal row, carrying isPenalty through', () => {
    const row: MatchEventRow = {
      id: 'event-2',
      convocation_id: 'c1',
      user_id: 'player-1',
      event_type: 'goal',
      is_penalty: true,
      created_by: 'coach-1',
      created_at: '2026-09-24T18:35:00.000Z',
    }

    expect(toMatchEvent(row).isPenalty).toBe(true)
  })

  it('maps a card row', () => {
    const row: MatchEventRow = {
      id: 'event-3',
      convocation_id: 'c1',
      user_id: 'player-2',
      event_type: 'yellow_card',
      is_penalty: false,
      created_by: 'coach-1',
      created_at: '2026-09-24T18:40:00.000Z',
    }

    expect(toMatchEvent(row).eventType).toBe('yellow_card')
  })

  it('maps a domain event into an insert row, omitting id/createdAt (database-generated)', () => {
    const event: Omit<MatchEvent, 'id' | 'createdAt'> = {
      convocationId: 'c1',
      userId: 'player-1',
      eventType: 'penalty_missed',
      isPenalty: false,
      createdBy: 'coach-1',
    }

    expect(toMatchEventInsertRow(event)).toEqual({
      convocation_id: 'c1',
      user_id: 'player-1',
      event_type: 'penalty_missed',
      is_penalty: false,
      created_by: 'coach-1',
    })
  })
})
