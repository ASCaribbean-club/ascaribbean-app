import { describe, expect, it } from 'vitest'
import type { CreatePaymentInput } from '@domain/repositories/payment-repository'
import type { PaymentRow } from '../dto/payment-dto'
import { toPayment, toPaymentInsertRow } from './payment-mapper'

describe('toPayment', () => {
  it('maps every column', () => {
    const row: PaymentRow = {
      id: 'payment-1',
      membership_id: 'membership-1',
      amount_cents: 15000,
      paid_at: '2026-09-17',
      recorded_by: 'admin-1',
      recorded_at: '2026-09-17T10:00:00.000Z',
    }

    expect(toPayment(row)).toEqual({
      id: 'payment-1',
      membershipId: 'membership-1',
      amountCents: 15000,
      paidAt: '2026-09-17',
      recordedBy: 'admin-1',
      recordedAt: '2026-09-17T10:00:00.000Z',
    })
  })
})

describe('toPaymentInsertRow', () => {
  // §2.2 — never routes recordedAt through: the database default (now())
  // is authoritative, this mapper doesn't even have a field to accept a
  // client-supplied one (CreatePaymentInput omits it entirely).
  it('maps every field to its snake_case column, and never includes recorded_at', () => {
    const input: CreatePaymentInput = {
      membershipId: 'membership-1',
      amountCents: 15000,
      paidAt: '2026-09-17',
      recordedBy: 'admin-1',
    }

    const row = toPaymentInsertRow(input)

    expect(row).toEqual({
      membership_id: 'membership-1',
      amount_cents: 15000,
      paid_at: '2026-09-17',
      recorded_by: 'admin-1',
    })
    expect(row).not.toHaveProperty('recorded_at')
    expect(row).not.toHaveProperty('id')
  })
})
