import { describe, expect, it } from 'vitest'
import type { AdminConvocationListItem } from '@domain/entities/admin-convocation'
import {
  EMPTY_CONVOCATION_FORM_VALUES,
  MEETING_POINT_MESSAGE,
  PAST_DATE_MESSAGE,
  getFormCreationWindow,
  REQUIRED_FIELD_MESSAGE,
  buildCreateInput,
  buildUpdateInput,
  resetTypeSpecificValues,
  validateConvocationForm,
  valuesEqual,
  valuesFromItem,
  type ConvocationFormValues,
} from './convocation-form'

const NOW = new Date(2026, 9, 1, 12, 0) // local time, like the native inputs
const FUTURE_DATE = '2026-10-05'

function values(overrides: Partial<ConvocationFormValues> = {}): ConvocationFormValues {
  return {
    ...EMPTY_CONVOCATION_FORM_VALUES,
    sectionId: 's1',
    teamId: 't1',
    date: FUTURE_DATE,
    time: '15:00',
    ...overrides,
  }
}

describe('validateConvocationForm', () => {
  it('requires section and team on creation only', () => {
    const emptyTeam = values({
      sectionId: '',
      teamId: '',
      trainingLocationId: 'l1',
    })
    expect(validateConvocationForm(emptyTeam, 'create', NOW)).toMatchObject({
      sectionId: REQUIRED_FIELD_MESSAGE,
      teamId: REQUIRED_FIELD_MESSAGE,
    })
    expect(validateConvocationForm(emptyTeam, 'edit', NOW)).toEqual({})
  })

  it('requires date and time', () => {
    const errors = validateConvocationForm(values({ date: '', time: '', trainingLocationId: 'l1' }), 'create', NOW)
    expect(errors.date).toBe(REQUIRED_FIELD_MESSAGE)
    expect(errors.time).toBe(REQUIRED_FIELD_MESSAGE)
  })

  it('refuses a date/time in the past, and one equal to now, when editing', () => {
    expect(validateConvocationForm(values({ date: '2026-09-30', trainingLocationId: 'l1' }), 'edit', NOW).date).toBe(PAST_DATE_MESSAGE)
    expect(validateConvocationForm(values({ date: '2026-10-01', time: '12:00', trainingLocationId: 'l1' }), 'edit', NOW).date).toBe(
      PAST_DATE_MESSAGE,
    )
  })

  it('accepts a past date/time when creating (retroactive entry, decided by the creation window)', () => {
    expect(validateConvocationForm(values({ date: '2026-09-30', trainingLocationId: 'l1' }), 'create', NOW).date).toBeUndefined()
  })

  it('accepts a complete training', () => {
    expect(validateConvocationForm(values({ trainingLocationId: 'l1' }), 'create', NOW)).toEqual({})
  })

  it('requires the venue of a training', () => {
    expect(validateConvocationForm(values(), 'create', NOW).trainingLocationId).toBe(REQUIRED_FIELD_MESSAGE)
  })

  it('requires opponent and location for a match, but not the RDV (AC-WC-15)', () => {
    const errors = validateConvocationForm(values({ type: 'match' }), 'create', NOW)
    expect(errors).toEqual({
      opponentId: REQUIRED_FIELD_MESSAGE,
      location: REQUIRED_FIELD_MESSAGE,
    })
    expect(validateConvocationForm(values({ type: 'match', opponentId: 'o1', location: 'Stade' }), 'create', NOW)).toEqual({})
  })

  it('validates a set RDV against the kickoff, the same day', () => {
    const base = {
      type: 'match' as const,
      opponentId: 'o1',
      location: 'Stade',
    }
    expect(validateConvocationForm(values({ ...base, meetingPointTime: '14:00' }), 'create', NOW)).toEqual({})
    expect(validateConvocationForm(values({ ...base, meetingPointTime: '15:00' }), 'create', NOW).meetingPointTime).toBe(
      MEETING_POINT_MESSAGE,
    )
    expect(validateConvocationForm(values({ ...base, meetingPointTime: '16:00' }), 'create', NOW).meetingPointTime).toBe(
      MEETING_POINT_MESSAGE,
    )
  })

  it('does not validate an RDV location on its own (independent of the RDV time)', () => {
    const errors = validateConvocationForm(
      values({
        type: 'match',
        opponentId: 'o1',
        location: 'Stade',
        meetingPointLocation: 'Vestiaires',
      }),
      'create',
      NOW,
    )
    expect(errors).toEqual({})
  })

  it('requires title and location for a meeting; the agenda is optional', () => {
    expect(validateConvocationForm(values({ type: 'meeting', title: '  ' }), 'create', NOW)).toEqual({
      title: REQUIRED_FIELD_MESSAGE,
      location: REQUIRED_FIELD_MESSAGE,
    })
    expect(validateConvocationForm(values({ type: 'meeting', title: 'Bilan', location: 'Salle' }), 'create', NOW)).toEqual({})
  })
})

describe('resetTypeSpecificValues', () => {
  it('keeps team, date and time and resets every type-specific field', () => {
    const filled = values({
      type: 'match',
      opponentId: 'o1',
      location: 'Stade',
      isHome: false,
      meetingPointTime: '14:00',
      meetingPointLocation: 'Vestiaires',
      title: 'x',
      agenda: ['a'],
      trainingLocationId: 'l1',
    })
    expect(resetTypeSpecificValues(filled, 'meeting')).toEqual({
      ...EMPTY_CONVOCATION_FORM_VALUES,
      sectionId: 's1',
      teamId: 't1',
      date: FUTURE_DATE,
      time: '15:00',
      type: 'meeting',
    })
  })
})

describe('buildCreateInput', () => {
  it('builds a training input with only training fields', () => {
    const input = buildCreateInput(
      values({
        trainingLocationId: 'l1',
        location: 'ignored',
        title: 'ignored',
      }),
      'admin-1',
    )
    expect(input).toEqual({
      type: 'training',
      teamId: 't1',
      createdBy: 'admin-1',
      date: new Date(`${FUTURE_DATE}T15:00`).toISOString(),
      trainingLocationId: 'l1',
    })
  })

  it('builds a match input, RDV optional both ways', () => {
    const none = buildCreateInput(values({ type: 'match', opponentId: 'o1', location: ' Stade ' }), 'admin-1')
    expect(none).toMatchObject({
      type: 'match',
      location: 'Stade',
      isHome: true,
      meetingPointTime: null,
      meetingPointLocation: null,
    })

    const some = buildCreateInput(
      values({
        type: 'match',
        opponentId: 'o1',
        location: 'Stade',
        meetingPointTime: '14:00',
        meetingPointLocation: ' Vestiaires ',
      }),
      'admin-1',
    )
    expect(some).toMatchObject({
      meetingPointTime: new Date(`${FUTURE_DATE}T14:00`).toISOString(),
      meetingPointLocation: 'Vestiaires',
    })
  })

  it('builds a meeting input with the ordered agenda', () => {
    const input = buildCreateInput(
      values({
        type: 'meeting',
        title: ' Bilan ',
        location: 'Salle',
        agenda: ['a', 'b'],
      }),
      'admin-1',
    )
    expect(input).toMatchObject({
      type: 'meeting',
      title: 'Bilan',
      location: 'Salle',
      agenda: ['a', 'b'],
    })
  })
})

describe('buildUpdateInput', () => {
  const context = { actorId: 'admin-1', convocationId: 'c1', now: NOW }

  it('never carries a team id and keeps the type as discriminator', () => {
    const input = buildUpdateInput(values({ trainingLocationId: 'l1' }), context)
    expect(input).toEqual({
      ...context,
      type: 'training',
      date: new Date(`${FUTURE_DATE}T15:00`).toISOString(),
      trainingLocationId: 'l1',
    })
    expect(input).not.toHaveProperty('teamId')
  })

  it('builds the match and meeting variants', () => {
    expect(
      buildUpdateInput(
        values({
          type: 'match',
          opponentId: 'o1',
          location: 'Stade',
          isHome: false,
        }),
        context,
      ),
    ).toMatchObject({
      type: 'match',
      isHome: false,
      meetingPointTime: null,
    })
    expect(buildUpdateInput(values({ type: 'meeting', title: 'T', location: 'L' }), context)).toMatchObject({ type: 'meeting', agenda: [] })
  })
})

describe('valuesFromItem / valuesEqual (edit prefill and dirty check)', () => {
  const item: AdminConvocationListItem = {
    convocation: {
      id: 'c1',
      teamId: 't1',
      type: 'match',
      date: new Date(2026, 9, 5, 15, 0).toISOString(),
      location: 'Stade',
      trainingLocation: null,
      status: 'open',
      closedAt: null,
      closedBy: null,
      cancelledAt: null,
      cancelledBy: null,
      cancellationReason: null,
      createdBy: 'u1',
      createdAt: '2026-01-01T00:00:00.000Z',
    },
    teamName: 'Équipe A',
    sectionId: 's1',
    seasonId: 'y1',
    creatorName: null,
    match: {
      opponentId: 'o1',
      opponentName: 'Adversaire',
      isHome: false,
      meetingPointTime: new Date(2026, 9, 5, 14, 0).toISOString(),
      meetingPointLocation: 'Vestiaires',
    },
    meeting: null,
    attendance: { present: 0, absent: 0, rosterSize: 0 },
  }

  it('pre-fills date, time, match fields and RDV from the stored convocation', () => {
    expect(valuesFromItem(item)).toMatchObject({
      teamId: 't1',
      type: 'match',
      date: '2026-10-05',
      time: '15:00',
      location: 'Stade',
      opponentId: 'o1',
      isHome: false,
      meetingPointTime: '14:00',
      meetingPointLocation: 'Vestiaires',
    })
  })

  it('detects no change on the untouched prefill, and a change on any field', () => {
    const base = valuesFromItem(item)
    expect(valuesEqual(base, valuesFromItem(item))).toBe(true)
    expect(valuesEqual(base, { ...base, isHome: true })).toBe(false)
    expect(valuesEqual(base, { ...base, agenda: ['x'] })).toBe(false)
  })
})

describe('getFormCreationWindow', () => {
  it('is null while the date or time is missing', () => {
    expect(getFormCreationWindow(values({ date: '', time: '' }), NOW)).toBeNull()
  })

  it('is open well before the response deadline', () => {
    expect(getFormCreationWindow(values({ date: '2026-10-02', time: '18:00' }), NOW)).toBe('open')
  })

  it('is response_closed inside the training deadline (10 min)', () => {
    expect(getFormCreationWindow(values({ type: 'training', date: '2026-10-01', time: '12:05' }), NOW)).toBe('response_closed')
  })

  it('is retroactive once the kickoff has passed', () => {
    expect(getFormCreationWindow(values({ date: '2026-09-30', time: '18:00' }), NOW)).toBe('retroactive')
  })
})
