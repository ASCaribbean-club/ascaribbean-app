import { describe, expect, it } from 'vitest'
import { toUpdateMatchRpcParams, toUpdateMeetingRpcParams, toUpdateTrainingRpcParams } from './convocation-update-mapper'

describe('convocation update mappers (payload -> RPC parameters)', () => {
  it('maps a training payload to exactly three parameters', () => {
    expect(
      toUpdateTrainingRpcParams({ convocationId: 'c1', type: 'training', date: '2026-10-05T15:00:00.000Z', trainingLocationId: 'l1' }),
    ).toEqual({ p_convocation_id: 'c1', p_date: '2026-10-05T15:00:00.000Z', p_training_location_id: 'l1' })
  })

  it('maps a match payload, keeping optional meeting point values null', () => {
    expect(
      toUpdateMatchRpcParams({
        convocationId: 'c1',
        type: 'match',
        date: '2026-10-05T15:00:00.000Z',
        location: 'Stade',
        opponentId: 'o1',
        isHome: false,
        meetingPointTime: null,
        meetingPointLocation: null,
      }),
    ).toEqual({
      p_convocation_id: 'c1',
      p_date: '2026-10-05T15:00:00.000Z',
      p_location: 'Stade',
      p_opponent_id: 'o1',
      p_is_home: false,
      p_meeting_point_time: null,
      p_meeting_point_location: null,
    })
  })

  it('maps a meeting payload with its ordered agenda', () => {
    expect(
      toUpdateMeetingRpcParams({
        convocationId: 'c1',
        type: 'meeting',
        date: '2026-10-05T15:00:00.000Z',
        location: 'Salle',
        title: 'Bilan',
        agenda: ['a', 'b'],
      }),
    ).toEqual({
      p_convocation_id: 'c1',
      p_date: '2026-10-05T15:00:00.000Z',
      p_location: 'Salle',
      p_title: 'Bilan',
      p_agenda: ['a', 'b'],
    })
  })

  it('never produces a team, type or status parameter', () => {
    const params = toUpdateMatchRpcParams({
      convocationId: 'c1',
      type: 'match',
      date: 'd',
      location: 'l',
      opponentId: 'o',
      isHome: true,
      meetingPointTime: null,
      meetingPointLocation: null,
    })
    expect(Object.keys(params).some((key) => /team|type|status/.test(key))).toBe(false)
  })
})
