import { describe, expect, it } from 'vitest'
import type { AdminConvocationDto } from '../dto/admin-convocation-dto'
import { toAdminConvocationListItem } from './admin-convocation-mapper'

function dtoOf(overrides: Partial<AdminConvocationDto> = {}): AdminConvocationDto {
  return {
    id: 'convocation-1',
    team_id: 'team-1',
    type: 'match',
    date: '2026-10-05T15:00:00.000Z',
    location: 'Stade',
    training_location_id: null,
    status: 'open',
    closed_at: null,
    closed_by: null,
    cancelled_at: null,
    cancelled_by: null,
    cancellation_reason: null,
    created_by: 'creator-1',
    created_at: '2026-01-01T00:00:00.000Z',
    teams: {
      id: 'team-1',
      name: 'Équipe A',
      section_id: 'section-1',
      season_id: 'season-1',
      user_roles: [{ role: 'player' }, { role: 'player' }, { role: 'coach' }],
    },
    match_details: {
      opponent_id: 'opponent-1',
      is_home: true,
      meeting_point_time: null,
      meeting_point_location: null,
      opponents: { name: 'Adversaire' },
    },
    meeting_details: null,
    users: { full_name: 'Créateur' },
    attendance_records: [{ actual_status: 'present' }, { actual_status: 'absent' }, { actual_status: 'present' }],
    ...overrides,
  }
}

describe('toAdminConvocationListItem', () => {
  it('maps the convocation, team, creator and match satellite', () => {
    const item = toAdminConvocationListItem(dtoOf())
    expect(item.convocation).toMatchObject({ id: 'convocation-1', teamId: 'team-1', type: 'match', createdBy: 'creator-1' })
    expect(item.teamName).toBe('Équipe A')
    expect(item.sectionId).toBe('section-1')
    expect(item.seasonId).toBe('season-1')
    expect(item.creatorName).toBe('Créateur')
    expect(item.match).toEqual({
      opponentId: 'opponent-1',
      opponentName: 'Adversaire',
      isHome: true,
      meetingPointTime: null,
      meetingPointLocation: null,
    })
    expect(item.meeting).toBeNull()
  })

  it('counts AttendanceRecord rows and sizes the roster from player roles only (AC-WC-08)', () => {
    expect(toAdminConvocationListItem(dtoOf()).attendance).toEqual({ present: 2, absent: 1, rosterSize: 2 })
  })

  it('maps a meeting satellite, with a null agenda becoming an empty list', () => {
    const item = toAdminConvocationListItem(
      dtoOf({ type: 'meeting', match_details: null, meeting_details: { title: 'Bilan', agenda: null } }),
    )
    expect(item.meeting).toEqual({ title: 'Bilan', agenda: [] })
    expect(item.match).toBeNull()
  })

  it('tolerates a to-one embed returned as a one-element array', () => {
    const item = toAdminConvocationListItem(
      dtoOf({ users: [{ full_name: 'Créateur' }], match_details: [dtoOf().match_details as never] as never }),
    )
    expect(item.creatorName).toBe('Créateur')
    expect(item.match?.opponentId).toBe('opponent-1')
  })

  it('degrades gracefully when embeds are missing', () => {
    const item = toAdminConvocationListItem(
      dtoOf({ teams: null, users: null, match_details: null, attendance_records: null }),
    )
    expect(item.teamName).toBe('')
    expect(item.creatorName).toBeNull()
    expect(item.attendance).toEqual({ present: 0, absent: 0, rosterSize: 0 })
  })

  it('resolves the training location embed through the convocation mapper', () => {
    const item = toAdminConvocationListItem(
      dtoOf({
        type: 'training',
        location: null,
        training_location_id: 'location-1',
        training_location: { id: 'location-1', name: 'Gymnase', address: '1 rue', is_archived: true },
        match_details: null,
      }),
    )
    expect(item.convocation.trainingLocation).toEqual({ id: 'location-1', name: 'Gymnase', address: '1 rue', isArchived: true })
  })
})
