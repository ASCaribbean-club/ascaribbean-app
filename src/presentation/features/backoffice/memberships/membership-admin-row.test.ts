import { describe, expect, it } from 'vitest'
import type { Membership } from '@domain/entities/membership'
import type { Payment } from '@domain/entities/payment'
import type { Season } from '@domain/entities/season'
import type { UserSummary } from '@domain/repositories/user-repository'
import { assembleMembershipAdminRows } from './membership-admin-row'

// specs/web-dashboard.md §2.4a/AC-WD-12 — the ONE assembly function shared
// between useBackofficeMembershipsViewModel and /admin/overview's
// UnpaidDuesPanel: covering it here (a plain function, no mocks needed)
// protects both screens at once against a future regression on
// effectiveAmountDueCents' own fallback, the payment sum, or the status
// predicate diverging between the two callers.

function buildMembership(overrides: Partial<Membership> = {}): Membership {
  return {
    id: 'membership-1',
    userId: 'user-1',
    licenceNumber: null,
    status: 'pending',
    seasonId: 'season-1',
    validUntil: '2027-06-30',
    amountDueCents: null,
    ...overrides,
  }
}

function buildUser(overrides: Partial<UserSummary> = {}): UserSummary {
  return { id: 'user-1', fullName: 'Compte Un', email: 'compte-un@example.test', ...overrides }
}

function buildSeason(overrides: Partial<Season> = {}): Season {
  return { id: 'season-1', label: '2025-2026', startDate: '2025-08-01', endDate: '2026-07-31', cotisationAmount: null, ...overrides }
}

function buildPayment(overrides: Partial<Payment> = {}): Payment {
  return {
    id: 'payment-1',
    membershipId: 'membership-1',
    amountCents: 5000,
    paidAt: '2026-01-01',
    recordedBy: 'admin-1',
    recordedAt: '2026-01-01T00:00:00.000Z',
    ...overrides,
  }
}

describe('assembleMembershipAdminRows', () => {
  it('resolves the user fullName and season label from the id-keyed lookups', () => {
    const [row] = assembleMembershipAdminRows([buildMembership()], [buildUser({ fullName: 'Compte Deux' })], [buildSeason({ label: '2026-2027' })], [])

    expect(row.userFullName).toBe('Compte Deux')
    expect(row.seasonLabel).toBe('2026-2027')
  })

  it('falls back to an empty string when the user or season cannot be resolved', () => {
    const [row] = assembleMembershipAdminRows([buildMembership({ userId: 'ghost', seasonId: 'ghost' })], [buildUser()], [buildSeason()], [])

    expect(row.userFullName).toBe('')
    expect(row.seasonLabel).toBe('')
  })

  it('uses the membership own amountDueCents when set, ignoring the season tarif', () => {
    const [row] = assembleMembershipAdminRows(
      [buildMembership({ amountDueCents: 20000 })],
      [buildUser()],
      [buildSeason({ cotisationAmount: 300 })],
      [],
    )

    expect(row.effectiveAmountDueCents).toBe(20000)
    expect(row.seasonCotisationAmount).toBe(300)
  })

  it('falls back to the season cotisationAmount (converted to cents) when the membership has none of its own', () => {
    const [row] = assembleMembershipAdminRows([buildMembership({ amountDueCents: null })], [buildUser()], [buildSeason({ cotisationAmount: 300 })], [])

    expect(row.effectiveAmountDueCents).toBe(30000)
  })

  it('stays null when neither the membership nor its season carries an amount due', () => {
    const [row] = assembleMembershipAdminRows([buildMembership({ amountDueCents: null })], [buildUser()], [buildSeason({ cotisationAmount: null })], [])

    expect(row.effectiveAmountDueCents).toBeNull()
    expect(row.paymentStatus).toBe('undefined')
  })

  it('sums only the payments for this membership, grouped by membershipId, never leaking into another row', () => {
    const rows = assembleMembershipAdminRows(
      [buildMembership({ id: 'membership-1', amountDueCents: 10000 }), buildMembership({ id: 'membership-2', amountDueCents: 10000 })],
      [buildUser()],
      [buildSeason()],
      [
        buildPayment({ id: 'p1', membershipId: 'membership-1', amountCents: 4000 }),
        buildPayment({ id: 'p2', membershipId: 'membership-1', amountCents: 1000 }),
        buildPayment({ id: 'p3', membershipId: 'membership-2', amountCents: 10000 }),
      ],
    )

    const row1 = rows.find((row) => row.membership.id === 'membership-1')!
    const row2 = rows.find((row) => row.membership.id === 'membership-2')!

    expect(row1.paidCents).toBe(5000)
    expect(row1.paymentStatus).toBe('partial')
    expect(row2.paidCents).toBe(10000)
    expect(row2.paymentStatus).toBe('paid')
  })
})
