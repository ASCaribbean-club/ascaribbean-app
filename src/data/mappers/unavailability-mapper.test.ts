import { describe, expect, it } from 'vitest'
import type { UnavailabilityRow } from '@data/dto/unavailability-row'
import { toUnavailability, toUnavailabilityInsertRow, toUnavailabilityUpdateRow } from './unavailability-mapper'

const baseRow: UnavailabilityRow = {
  id: 'un-1',
  user_id: 'p-1',
  kind: 'medical',
  starts_on: '2026-09-24',
  declared_by: 'c-1',
  declared_at: '2026-09-24T08:00:00Z',
  expected_return_on: null,
  match_count: null,
  reason: null,
  lifted_on: null,
}

describe('unavailability mapper', () => {
  it('maps a medical row with an indefinite end', () => {
    expect(toUnavailability(baseRow)).toEqual({
      id: 'un-1',
      userId: 'p-1',
      kind: 'medical',
      startsOn: '2026-09-24',
      declaredBy: 'c-1',
      declaredAt: '2026-09-24T08:00:00Z',
      expectedReturnOn: null,
    })
  })

  it('maps a medical row with a return date and never exposes free text', () => {
    const entity = toUnavailability({ ...baseRow, expected_return_on: '2026-10-20', reason: 'should be ignored' })
    expect(entity).toMatchObject({ kind: 'medical', expectedReturnOn: '2026-10-20' })
    expect('reason' in entity).toBe(false)
  })

  it('maps a suspension row, keeping null reason and lift', () => {
    expect(toUnavailability({ ...baseRow, kind: 'suspension', match_count: 2 })).toMatchObject({
      kind: 'suspension',
      matchCount: 2,
      reason: null,
      liftedOn: null,
    })
  })

  it('maps a suspension row with reason and lift date', () => {
    expect(toUnavailability({ ...baseRow, kind: 'suspension', match_count: 1, reason: 'card', lifted_on: '2026-10-06' })).toMatchObject({
      reason: 'card',
      liftedOn: '2026-10-06',
    })
  })

  it('throws on an unknown kind', () => {
    expect(() => toUnavailability({ ...baseRow, kind: 'other' })).toThrow()
  })

  it('insert row for medical nulls the suspension-only columns', () => {
    expect(
      toUnavailabilityInsertRow({
        userId: 'p-1', kind: 'medical', startsOn: '2026-09-24', declaredBy: 'c-1', declaredAt: 'x', expectedReturnOn: '2026-10-20',
      }),
    ).toEqual({
      user_id: 'p-1', kind: 'medical', starts_on: '2026-09-24', declared_by: 'c-1',
      expected_return_on: '2026-10-20', match_count: null, reason: null, lifted_on: null,
    })
  })

  it('insert row for suspension nulls the medical-only column', () => {
    expect(
      toUnavailabilityInsertRow({
        userId: 'p-1', kind: 'suspension', startsOn: '2026-09-24', declaredBy: 'c-1', declaredAt: 'x', matchCount: 3, reason: null, liftedOn: null,
      }),
    ).toMatchObject({ kind: 'suspension', match_count: 3, expected_return_on: null, reason: null, lifted_on: null })
  })

  it('update row only carries grantable columns', () => {
    const row = toUnavailabilityUpdateRow({ ...toUnavailability(baseRow), kind: 'medical', expectedReturnOn: '2026-11-01' } as ReturnType<typeof toUnavailability>)
    expect(Object.keys(row).sort()).toEqual(['expected_return_on', 'lifted_on', 'match_count', 'reason', 'starts_on'])
    expect(row.expected_return_on).toBe('2026-11-01')
  })
})
