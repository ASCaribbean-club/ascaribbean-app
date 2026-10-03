import { describe, expect, it } from 'vitest'
import type { Convocation } from '@domain/entities/convocation'
import type { Section } from '@domain/entities/section'
import type { ClubScheduleItem } from '@domain/usecases/club-overview/ListClubScheduleUseCase'
import { toDirigeantEventView } from './dirigeant-event-view'

const sections = new Map<string, Section>([
  ['s-esport', { id: 's-esport', name: 'E-Sport', type: 'esport', createdAt: '2026-01-01T00:00:00.000Z' }],
])

function item(sectionId: string, convocation: Partial<Convocation> = {}): ClubScheduleItem {
  return {
    convocation: {
      id: 'c1',
      teamId: 't1',
      type: 'training',
      date: '2026-10-08T17:30:00.000Z',
      location: null,
      trainingLocation: { id: 'l1', name: 'Stade municipal', address: '1 rue du Stade', isArchived: false },
      status: 'open',
      closedAt: null,
      closedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: 'u1',
      createdAt: '2026-09-01T00:00:00.000Z',
      ...convocation,
    } as Convocation,
    team: { id: 't1', name: 'Seniors', sectionId, seasonId: 'season-1' },
    matchDetails: null,
    opponent: null,
    meetingDetails: null,
  }
}

describe('toDirigeantEventView', () => {
  it('composes "type — team name", the location label and the section tag', () => {
    const view = toDirigeantEventView(item('s-esport'), sections)
    expect(view.title).toBe('Entraînement — Seniors')
    expect(view.location).toBe('Stade municipal')
    expect(view.section).toEqual({ name: 'E-Sport', type: 'esport' })
  })

  it('falls back to a neutral "Sans section" tag when the section is unknown', () => {
    const view = toDirigeantEventView(item('unknown'), sections)
    expect(view.section).toEqual({ name: 'Sans section', type: null })
  })

  it('exposes the meeting point time of a match only', () => {
    const match = item('s-esport', { type: 'match', location: 'Stade' })
    match.matchDetails = {
      convocationId: 'c1',
      opponentId: 'o1',
      isHome: true,
      meetingPointTime: '2026-10-08T16:30:00.000Z',
      meetingPointLocation: null,
      goalsFor: null,
      goalsAgainst: null,
    }
    expect(toDirigeantEventView(match, sections).meetingPointTime).toBe('2026-10-08T16:30:00.000Z')
    expect(toDirigeantEventView(item('s-esport'), sections).meetingPointTime).toBeNull()
  })
})
