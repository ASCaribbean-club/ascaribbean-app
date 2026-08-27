import { describe, expect, it } from 'vitest'
import type { MeetingDetails } from '@domain/entities/meeting-details'
import type { MeetingDetailsRow } from '../dto/meeting-details-dto'
import { toMeetingDetails, toMeetingDetailsRow } from './meeting-details-mapper'

const row: MeetingDetailsRow = {
  convocation_id: 'convo-1',
  title: 'Assemblée générale',
  agenda: ['Bilan financier', 'Élection du bureau'],
}

const details: MeetingDetails = {
  convocationId: 'convo-1',
  title: 'Assemblée générale',
  agenda: ['Bilan financier', 'Élection du bureau'],
}

describe('toMeetingDetails', () => {
  it('maps a row to an entity', () => {
    expect(toMeetingDetails(row)).toEqual(details)
  })

  it('preserves agenda item order', () => {
    const reordered: MeetingDetailsRow = { ...row, agenda: ['Élection du bureau', 'Bilan financier'] }
    expect(toMeetingDetails(reordered).agenda).toEqual(['Élection du bureau', 'Bilan financier'])
  })

  it('maps an empty agenda to an empty array', () => {
    expect(toMeetingDetails({ ...row, agenda: [] }).agenda).toEqual([])
  })
})

describe('toMeetingDetailsRow', () => {
  it('maps an entity to a row', () => {
    expect(toMeetingDetailsRow(details)).toEqual(row)
  })
})