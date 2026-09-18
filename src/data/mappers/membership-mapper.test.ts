import { describe, expect, it } from 'vitest'
import type { CreateMembershipInput, UpdateMembershipInput } from '@domain/repositories/membership-repository'
import type { MembershipRow } from '../dto/membership-dto'
import { toMembership, toMembershipInsertRow, toMembershipUpdateRow } from './membership-mapper'

describe('toMembership', () => {
  it('maps every column, ignoring archived_at/archived_by (not part of the domain entity)', () => {
    const row: MembershipRow = {
      id: 'membership-1',
      user_id: 'user-1',
      licence_number: 'FR-12345',
      status: 'active',
      season_id: 'season-1',
      valid_until: '2027-06-30',
      archived_at: null,
      archived_by: null,
      amount_due_cents: 30000,
    }

    expect(toMembership(row)).toEqual({
      id: 'membership-1',
      userId: 'user-1',
      licenceNumber: 'FR-12345',
      status: 'active',
      seasonId: 'season-1',
      validUntil: '2027-06-30',
      amountDueCents: 30000,
    })
  })

  // §2.1, mockup row 1 — a null licence number is a normal, valid case.
  it('maps a null licence_number as null, not an empty string', () => {
    const row: MembershipRow = {
      id: 'membership-2',
      user_id: 'user-2',
      licence_number: null,
      status: 'pending',
      season_id: 'season-1',
      valid_until: '2027-06-30',
      archived_at: null,
      archived_by: null,
      amount_due_cents: null,
    }

    expect(toMembership(row).licenceNumber).toBeNull()
  })

  // §2.1/AC-WM-34 — a membership created through "Nouvelle adhésion" (which
  // doesn't carry this field) has no amount due yet: null, not 0.
  it('maps a null amount_due_cents as null, not zero', () => {
    const row: MembershipRow = {
      id: 'membership-3',
      user_id: 'user-3',
      licence_number: null,
      status: 'pending',
      season_id: 'season-1',
      valid_until: '2027-06-30',
      archived_at: null,
      archived_by: null,
      amount_due_cents: null,
    }

    expect(toMembership(row).amountDueCents).toBeNull()
  })
})

describe('toMembershipInsertRow', () => {
  it('maps every field to its snake_case column', () => {
    const input: CreateMembershipInput = {
      userId: 'user-1',
      seasonId: 'season-1',
      licenceNumber: 'FR-12345',
      status: 'active',
      validUntil: '2027-06-30',
      amountDueCents: null,
    }

    expect(toMembershipInsertRow(input)).toEqual({
      user_id: 'user-1',
      licence_number: 'FR-12345',
      status: 'active',
      season_id: 'season-1',
      valid_until: '2027-06-30',
      amount_due_cents: null,
    })
  })

  it('maps a null licenceNumber through unchanged', () => {
    const input: CreateMembershipInput = {
      userId: 'user-1',
      seasonId: 'season-1',
      licenceNumber: null,
      status: 'pending',
      validUntil: '2027-06-30',
      amountDueCents: null,
    }

    expect(toMembershipInsertRow(input).licence_number).toBeNull()
  })
})

describe('toMembershipUpdateRow', () => {
  it('maps every field to its snake_case column', () => {
    const input: UpdateMembershipInput = {
      userId: 'user-1',
      seasonId: 'season-1',
      licenceNumber: 'FR-99999',
      status: 'suspended',
      validUntil: '2026-06-30',
      amountDueCents: 30000,
    }

    expect(toMembershipUpdateRow(input)).toEqual({
      user_id: 'user-1',
      licence_number: 'FR-99999',
      status: 'suspended',
      season_id: 'season-1',
      valid_until: '2026-06-30',
      amount_due_cents: 30000,
    })
  })

  // §2.1/AC-WM-34 — the edit panel's "Cotisation totale (€)" field can be
  // cleared back to an unset amount.
  it('maps a null amountDueCents through unchanged', () => {
    const input: UpdateMembershipInput = {
      userId: 'user-1',
      seasonId: 'season-1',
      licenceNumber: 'FR-99999',
      status: 'pending',
      validUntil: '2026-06-30',
      amountDueCents: null,
    }

    expect(toMembershipUpdateRow(input).amount_due_cents).toBeNull()
  })
})
