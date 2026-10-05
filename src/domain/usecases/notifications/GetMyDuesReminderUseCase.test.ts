import { describe, expect, it, vi } from 'vitest'
import type { Membership } from '../../entities/membership'
import type { Notification } from '../../entities/notification'
import type { Payment } from '../../entities/payment'
import type { Season } from '../../entities/season'
import type { MembershipRepository } from '../../repositories/membership-repository'
import type { NotificationRepository } from '../../repositories/notification-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import { GetMyDuesReminderUseCase } from './GetMyDuesReminderUseCase'

const season: Season = { id: 'season-1', label: '2026-2027', startDate: '2026-09-01', endDate: '2027-06-30', cotisationAmount: null }

const membership: Membership = {
  id: 'm-1',
  userId: 'u-1',
  licenceNumber: null,
  status: 'pending',
  seasonId: 'season-1',
  validUntil: '2027-06-30',
  amountDueCents: 10000,
}

const notification: Notification = {
  id: 'n-1',
  recipientId: 'u-1',
  kind: 'dues_reminder',
  membershipId: 'm-1',
  sentAt: '2026-10-05T08:00:00.000Z',
  readAt: null,
}

function payment(amountCents: number): Payment {
  return { id: `p-${amountCents}`, membershipId: 'm-1', amountCents, paidAt: '2026-09-10', paymentMethod: null, recordedBy: 'x', recordedAt: '2026-09-10T10:00:00.000Z' }
}

interface Setup {
  season?: Season | null
  membership?: Membership | null
  notification?: Notification | null
  payments?: Payment[]
}

function build(setup: Setup = {}) {
  const payments = setup.payments ?? []
  const listForMembership = vi.fn(async () => payments)
  const useCase = new GetMyDuesReminderUseCase(
    { findCurrent: async () => (setup.season === undefined ? season : setup.season) } as unknown as SeasonRepository,
    { findForUserAndSeason: async () => (setup.membership === undefined ? membership : setup.membership) } as unknown as MembershipRepository,
    { listForMembership } as unknown as PaymentRepository,
    { findDuesReminderForMembership: async () => (setup.notification === undefined ? notification : setup.notification), markRead: async () => {} } satisfies NotificationRepository,
  )
  return { useCase, listForMembership }
}

describe('GetMyDuesReminderUseCase', () => {
  it('returns the live remaining amount, the season label and the last reminder date', async () => {
    const { useCase } = build({ payments: [payment(4000)] })
    expect(await useCase.execute({ userId: 'u-1' })).toEqual({
      notificationId: 'n-1',
      seasonLabel: '2026-2027',
      remainingCents: 6000,
      remindedAt: '2026-10-05T08:00:00.000Z',
    })
  })

  it('shows the full amount for an unpaid membership', async () => {
    const { useCase } = build()
    expect((await useCase.execute({ userId: 'u-1' }))?.remainingCents).toBe(10000)
  })

  it('exposes nothing beyond the five banner fields', async () => {
    const result = await build().useCase.execute({ userId: 'u-1' })
    expect(Object.keys(result ?? {}).sort()).toEqual(['notificationId', 'remainingCents', 'remindedAt', 'seasonLabel'])
  })

  it('uses the season tariff when the membership has no own amount', async () => {
    const { useCase } = build({ membership: { ...membership, amountDueCents: null }, season: { ...season, cotisationAmount: 80 } })
    expect((await useCase.execute({ userId: 'u-1' }))?.remainingCents).toBe(8000)
  })

  it('returns null once settled (resolution derived at read time, no write)', async () => {
    expect(await build({ payments: [payment(10000)] }).useCase.execute({ userId: 'u-1' })).toBeNull()
  })

  it('returns null for an over-paid membership', async () => {
    expect(await build({ payments: [payment(12000)] }).useCase.execute({ userId: 'u-1' })).toBeNull()
  })

  it('returns null with an undefined amount due', async () => {
    expect(await build({ membership: { ...membership, amountDueCents: null } }).useCase.execute({ userId: 'u-1' })).toBeNull()
  })

  it('returns null once hidden (read), without reading payments', async () => {
    const { useCase, listForMembership } = build({ notification: { ...notification, readAt: '2026-10-05T09:00:00.000Z' } })
    expect(await useCase.execute({ userId: 'u-1' })).toBeNull()
    expect(listForMembership).not.toHaveBeenCalled()
  })

  it('returns null with no notification', async () => {
    expect(await build({ notification: null }).useCase.execute({ userId: 'u-1' })).toBeNull()
  })

  it('returns null with no live membership (absent or archived)', async () => {
    expect(await build({ membership: null }).useCase.execute({ userId: 'u-1' })).toBeNull()
  })

  it('returns null between two seasons', async () => {
    expect(await build({ season: null }).useCase.execute({ userId: 'u-1' })).toBeNull()
  })

  it('returns null for a membership of another season', async () => {
    expect(await build({ membership: { ...membership, seasonId: 'season-0' } }).useCase.execute({ userId: 'u-1' })).toBeNull()
  })
})
