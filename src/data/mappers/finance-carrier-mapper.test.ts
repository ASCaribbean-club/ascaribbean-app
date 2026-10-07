import { describe, expect, it } from 'vitest'
import type { FinanceCarrierRow } from '../dto/finance-carrier-dto'
import { toAdminFinanceCarrier, toFinanceCarrierInsertRow, toFinanceCarrierUpdateRow } from './finance-carrier-mapper'

const row: FinanceCarrierRow = {
  id: 'c-1',
  label: 'Caisse buvette',
  kind: 'cash',
  detail: null,
  manager_user_id: 'u-1',
  archived_at: null,
  manager: { full_name: 'Compte' },
}

describe('toAdminFinanceCarrier', () => {
  it('maps a full row', () => {
    expect(toAdminFinanceCarrier(row)).toEqual({
      id: 'c-1',
      label: 'Caisse buvette',
      kind: 'cash',
      detail: null,
      managerUserId: 'u-1',
      managerName: 'Compte',
      archivedAt: null,
    })
  })

  it('maps the archived state', () => {
    expect(toAdminFinanceCarrier({ ...row, archived_at: '2026-09-30T10:00:00.000Z' }).archivedAt).toBe('2026-09-30T10:00:00.000Z')
  })

  it('maps an absent manager to nulls', () => {
    expect(toAdminFinanceCarrier({ ...row, kind: 'bank', detail: 'Courant', manager_user_id: null, manager: null })).toMatchObject({
      kind: 'bank',
      detail: 'Courant',
      managerUserId: null,
      managerName: null,
    })
  })

  it('throws on an unknown kind', () => {
    expect(() => toAdminFinanceCarrier({ ...row, kind: 'card' })).toThrow()
  })
})

describe('write payloads', () => {
  it('maps the insert payload with the four granted columns only', () => {
    expect(toFinanceCarrierInsertRow({ label: 'A', kind: 'bank', detail: null, managerUserId: null })).toEqual({
      label: 'A',
      kind: 'bank',
      detail: null,
      manager_user_id: null,
    })
  })

  it('never carries kind nor label_key in the update payload', () => {
    const payload = toFinanceCarrierUpdateRow({ label: 'A', detail: 'd', managerUserId: 'u-2' })
    expect(payload).toEqual({ label: 'A', detail: 'd', manager_user_id: 'u-2' })
    expect(Object.keys(payload)).not.toContain('kind')
    expect(Object.keys(payload)).not.toContain('label_key')
  })
})
