import { describe, expect, it } from 'vitest'
import type { AdminConvocationListItem } from '@domain/entities/admin-convocation'
import { toConvocationRowView } from './convocation-row-view'

const NOW = new Date('2026-10-01T12:00:00.000Z')

function itemOf(
  overrides: Partial<AdminConvocationListItem['convocation']> = {},
  rest: Partial<AdminConvocationListItem> = {},
): AdminConvocationListItem {
  return {
    convocation: {
      id: 'c1',
      teamId: 't1',
      type: 'training',
      date: '2026-09-30T18:00:00.000Z',
      location: null,
      trainingLocation: {
        id: 'l1',
        name: 'Gymnase',
        address: '1 rue',
        isArchived: false,
      },
      status: 'open',
      closedAt: null,
      closedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: 'u1',
      ...overrides,
    },
    teamName: 'Équipe A',
    sectionId: 's1',
    seasonId: 'y1',
    creatorName: 'Créateur',
    match: null,
    meeting: null,
    attendance: { present: 0, absent: 0, rosterSize: 12 },
    ...rest,
  }
}

describe('toConvocationRowView', () => {
  it('upcoming open: editable, no attendance entry, "—" attendance (AC-WC-08/12)', () => {
    const view = toConvocationRowView(itemOf({ date: '2026-10-05T18:00:00.000Z' }), NOW)
    expect(view.status).toBe('open')
    expect(view.canEdit).toBe(true)
    expect(view.attendanceLinkLabel).toBeNull()
    expect(view.attendance).toEqual({ kind: 'none' })
  })

  it('past open: "Passée" (never "Clôturée"), pending attendance, entry link, not editable (AC-WC-07)', () => {
    const view = toConvocationRowView(itemOf(), NOW)
    expect(view.status).toBe('past')
    expect(view.canEdit).toBe(false)
    expect(view.attendance).toEqual({ kind: 'pending' })
    expect(view.attendanceLinkLabel).toBe('Saisir les présences')
  })

  it('past open with partial records still shows pending, without counts', () => {
    const view = toConvocationRowView(itemOf({}, { attendance: { present: 3, absent: 1, rosterSize: 12 } }), NOW)
    expect(view.attendance).toEqual({ kind: 'pending' })
  })

  it('closed: counts of AttendanceRecord and "non saisis", correction link', () => {
    const view = toConvocationRowView(itemOf({ status: 'closed' }, { attendance: { present: 10, absent: 2, rosterSize: 12 } }), NOW)
    expect(view.status).toBe('closed')
    expect(view.attendance).toEqual({
      kind: 'counts',
      present: 10,
      absent: 2,
      unrecorded: 0,
    })
    expect(view.attendanceLinkLabel).toBe('Voir / modifier les présences')
  })

  it('never reports a negative "non saisis" when the roster shrank after closure', () => {
    const view = toConvocationRowView(itemOf({ status: 'closed' }, { attendance: { present: 10, absent: 2, rosterSize: 9 } }), NOW)
    expect(view.attendance).toMatchObject({ unrecorded: 0 })
  })

  it('cancelled: neither the pencil nor the attendance entry', () => {
    const view = toConvocationRowView(itemOf({ status: 'cancelled', date: '2026-10-05T18:00:00.000Z' }), NOW)
    expect(view.status).toBe('cancelled')
    expect(view.canEdit).toBe(false)
    expect(view.attendanceLinkLabel).toBeNull()
    expect(view.attendance).toEqual({ kind: 'none' })
  })

  it('panel of a training shows team and type as plain text plus the venue and its address', () => {
    const { panelFields } = toConvocationRowView(itemOf(), NOW)
    expect(panelFields).toContainEqual({ label: 'Équipe', value: 'Équipe A' })
    expect(panelFields).toContainEqual({
      label: 'Type',
      value: 'Entraînement',
    })
    expect(panelFields).toContainEqual({
      label: 'Lieu d’entraînement',
      value: 'Gymnase — 1 rue',
    })
  })

  it('panel of a match shows opponent, home/away, location and each RDV half separately', () => {
    const { panelFields } = toConvocationRowView(
      itemOf(
        { type: 'match', location: 'Stade', trainingLocation: null },
        {
          match: {
            opponentId: 'o1',
            opponentName: 'Adversaire',
            isHome: false,
            meetingPointTime: null,
            meetingPointLocation: 'Vestiaires',
          },
        },
      ),
      NOW,
    )
    expect(panelFields).toContainEqual({
      label: 'Adversaire',
      value: 'Adversaire',
    })
    expect(panelFields).toContainEqual({
      label: 'Domicile / Extérieur',
      value: 'Extérieur',
    })
    expect(panelFields).toContainEqual({ label: 'Lieu', value: 'Stade' })
    expect(panelFields).toContainEqual({
      label: 'RDV',
      value: 'Non renseigné · Vestiaires',
    })
  })

  it('panel of a meeting lists the agenda, with an empty label when there is none', () => {
    const { panelFields } = toConvocationRowView(
      itemOf({ type: 'meeting', location: 'Salle', trainingLocation: null }, { meeting: { title: 'Bilan', agenda: [] } }),
      NOW,
    )
    expect(panelFields).toContainEqual({ label: 'Titre', value: 'Bilan' })
    expect(panelFields).toContainEqual({
      label: 'Ordre du jour',
      items: [],
      emptyLabel: 'Aucun point',
    })
  })

  it('shows a dash for an unresolved creator', () => {
    const { panelFields } = toConvocationRowView(itemOf({}, { creatorName: null }), NOW)
    expect(panelFields).toContainEqual({ label: 'Créée par', value: '—' })
  })

  it('exposes the ✓/✗/? summary for a past open convocation, with unrecorded derived from the roster', () => {
    const view = toConvocationRowView(itemOf({}, { attendance: { present: 3, absent: 1, rosterSize: 12 } }), NOW)
    expect(view.attendanceSummary).toEqual({ present: 3, absent: 1, unrecorded: 8 })
  })

  it('exposes the summary for a closed convocation and clamps unrecorded at 0', () => {
    const view = toConvocationRowView(itemOf({ status: 'closed' }, { attendance: { present: 10, absent: 2, rosterSize: 9 } }), NOW)
    expect(view.attendanceSummary).toEqual({ present: 10, absent: 2, unrecorded: 0 })
  })

  it('has no summary for an upcoming convocation', () => {
    const view = toConvocationRowView(itemOf({ date: '2026-10-05T18:00:00.000Z' }), NOW)
    expect(view.attendanceSummary).toBeNull()
  })

  it('exposes the raw start instant for the calendar view', () => {
    expect(toConvocationRowView(itemOf(), NOW).startsAt).toBe('2026-09-30T18:00:00.000Z')
  })
})
