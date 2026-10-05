import { describe, expect, it } from 'vitest'
import type { ProfileDues } from '@domain/usecases/profile/GetProfileMembershipUseCase'
import { toProfileDuesView } from './profile-dues-view'

const base: ProfileDues = {
  amountDueCents: 12000,
  paidCents: 5000,
  status: 'partial',
  payments: [
    { id: 'p2', membershipId: 'm1', amountCents: 3000, paidAt: '2026-10-01', paymentMethod: null, recordedBy: 'x', recordedAt: '2026-10-01T10:00:00Z' },
    { id: 'p1', membershipId: 'm1', amountCents: 2000, paidAt: '2026-09-10', paymentMethod: 'transfer', recordedBy: 'x', recordedAt: '2026-09-10T10:00:00Z' },
  ],
  paymentUrl: 'https://pay.example.org/cotisation',
  showPaymentLink: true,
}

describe('toProfileDuesView', () => {
  it('formats paid / due, the status text and keeps the payments order', () => {
    const view = toProfileDuesView(base)

    expect(view.amountsLabel).toBe('50€ / 120€')
    expect(view.statusLabel).toBe('Partielle')
    expect(view.toggleAriaLabel).toBe('Cotisation, 50 euros sur 120 euros, Partielle')
    expect(view.payments.map((payment) => payment.id)).toEqual(['p2', 'p1'])
    expect(view.showPaymentLink).toBe(true)
    expect(view.paymentUrl).toBe('https://pay.example.org/cotisation')
    expect(view.isExpandable).toBe(true)
    expect(view.undefinedMention).toBeNull()
  })

  it('omits the method label when the payment has none, keeps it otherwise', () => {
    const view = toProfileDuesView(base)

    expect(view.payments[0].methodLabel).toBeNull()
    expect(view.payments[1].methodLabel).toBe('Virement')
  })

  it('renders the real amounts on over-payment', () => {
    const view = toProfileDuesView({ ...base, paidCents: 13000, status: 'paid', showPaymentLink: false })

    expect(view.amountsLabel).toBe('130€ / 120€')
    expect(view.statusLabel).toBe('Soldée')
    expect(view.showPaymentLink).toBe(false)
  })

  it('shows the paid amount alone with a neutral mention when no amount due exists', () => {
    const view = toProfileDuesView({ ...base, amountDueCents: null, status: 'undefined', showPaymentLink: false })

    expect(view.amountsLabel).toBe('50€')
    expect(view.undefinedMention).toBe('Montant non fixé')
    expect(view.isExpandable).toBe(true)
  })

  it('is not expandable when the amount due is unknown and nothing was paid', () => {
    const view = toProfileDuesView({ ...base, amountDueCents: null, paidCents: 0, status: 'undefined', payments: [], showPaymentLink: false })

    expect(view.isExpandable).toBe(false)
  })

  it('stays expandable with no payment when an amount is due (empty state shown)', () => {
    const view = toProfileDuesView({ ...base, paidCents: 0, status: 'unpaid', payments: [] })

    expect(view.isExpandable).toBe(true)
    expect(view.amountsLabel).toBe('0€ / 120€')
  })
})
