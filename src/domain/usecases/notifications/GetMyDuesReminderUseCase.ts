import type { MembershipRepository } from '../../repositories/membership-repository'
import type { NotificationRepository } from '../../repositories/notification-repository'
import type { PaymentRepository } from '../../repositories/payment-repository'
import type { SeasonRepository } from '../../repositories/season-repository'
import { isDuesAlertVisible } from '../../rules/dues-reminder-rules'
import { effectiveAmountDueCents, remainingDueCents, sumPaymentsCents } from '../../rules/membership-payment-rules'

export interface GetMyDuesReminderInput {
  userId: string
}

// Everything the member banner may show (AC-TR-39) and nothing else: no
// sender, no reminder count, no payments list, no total due, no payment link.
export interface DuesReminder {
  notificationId: string
  seasonLabel: string
  // Current remaining amount, computed at read time — never frozen at sending.
  remainingCents: number
  // ISO timestamp of the latest reminder.
  remindedAt: string
}

// specs/mobile-treasurer.md amendement (4), §H — the member's own reminder,
// or null when nothing must be shown (no notification, read, settled,
// archived, other season). RLS-only reads on the member's OWN rows
// (notifications_select_own, memberships_select_own,
// membership_payments_select_own_or_admin): no matrix entry.
// Resolution on payment is derived here by isDuesAlertVisible, never written.
export class GetMyDuesReminderUseCase {
  constructor(
    private readonly seasonRepository: SeasonRepository,
    private readonly membershipRepository: MembershipRepository,
    private readonly paymentRepository: PaymentRepository,
    private readonly notificationRepository: NotificationRepository,
  ) {}

  async execute(input: GetMyDuesReminderInput): Promise<DuesReminder | null> {
    const season = await this.seasonRepository.findCurrent()
    if (!season) return null

    // Archived rows are excluded by the repository: null here covers "archived".
    const membership = await this.membershipRepository.findForUserAndSeason(input.userId, season.id)
    if (!membership) return null

    const notification = await this.notificationRepository.findDuesReminderForMembership(membership.id)
    // Cheap early exit: no need to read payments for a read/absent alert.
    if (!notification || notification.readAt !== null) return null

    const payments = await this.paymentRepository.listForMembership(membership.id)
    const amountDueCents = effectiveAmountDueCents(membership.amountDueCents, season.cotisationAmount)
    const paidCents = sumPaymentsCents(payments)
    // Same single implementation as the Treasurer's list (AC-TR-39).
    // An undefined (null or <= 0) amount due yields 0: nothing owed.
    const remainingCents = remainingDueCents(paidCents, amountDueCents)

    const visible = isDuesAlertVisible({ notification, membership, currentSeasonId: season.id, remainingCents })
    if (!visible) return null

    return {
      notificationId: notification.id,
      seasonLabel: season.label,
      remainingCents,
      remindedAt: notification.sentAt,
    }
  }
}
