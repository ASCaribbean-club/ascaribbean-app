import type { MembershipPaymentStatus } from "@domain/rules/membership-payment-rules";
import {
  progressPercent,
  type TreasurerDueEntry,
} from "@domain/rules/treasurer-dues-rules";
import { formatEuros } from "@presentation/shared/formatters/currency";
import { getInitials } from "@presentation/shared/formatters/greeting";
import { formatPaymentMethod } from '@presentation/shared/formatters/payment-method-labels'
import { formatLongDate } from "@presentation/shared/formatters/long-date";
import { PAYMENT_STATUS_LABELS } from "@presentation/shared/formatters/payment-status-labels";
import { isReminderEligible } from "@domain/rules/dues-reminder-rules";
import {
  formatCooldownNotice,
  formatReminderState,
} from "@presentation/shared/formatters/dues-reminder-labels";

export interface DueView {
  id: string;
  name: string;
  initials: string;
  status: MembershipPaymentStatus;
  statusLabel: string;
  // "{paid} / {due}", or the paid amount alone when the due amount is unknown.
  amountsLabel: string;
  // null when settled (no "reste").
  remainingLabel: string | null;
  // Section name(s), or "Sans section" — only when the section filter is
  // visible (specs/mobile-treasurer.md §1), else null.
  sectionLabel: string | null;
  percent: number;
  // --- Reminders (specs/mobile-treasurer.md amendement (4), §G) ---
  // "Jamais relancé" / "{n} relance(s) · dernière il y a {n} j"; null when
  // there is nothing owed (settled or undefined amount): no line, no button.
  reminderStateLabel: string | null;
  // The "Relancer" button is offered only when true (a settled membership or
  // one reminded in the last 7 days is never eligible).
  isReminderEligible: boolean;
  // Replaces the button during the 7-day window ("Relancé il y a {n} j ·
  // prochaine relance le {date}"): a state, never a disabled control.
  reminderCooldownNotice: string | null;
  // methodLabel null = nothing rendered (rows recorded before the column).
  payments: { id: string; amountLabel: string; dateLabel: string; methodLabel: string | null }[];
}

// Pure display mapping of a domain entry; every amount and status was
// already computed by the domain (AC-TR-06).
export function toDueView(
  entry: TreasurerDueEntry,
  showSection: boolean,
  now: Date = new Date(),
): DueView {
  const owesSomething = entry.remainingCents > 0;
  const eligible = owesSomething && isReminderEligible(entry, now);
  const lastRemindedAt = entry.reminder.lastRemindedAt;
  return {
    id: entry.membershipId,
    name: entry.memberName,
    initials: getInitials(entry.memberName),
    status: entry.status,
    statusLabel: PAYMENT_STATUS_LABELS[entry.status],
    amountsLabel:
      entry.amountDueCents === null
        ? formatEuros(entry.paidCents)
        : `${formatEuros(entry.paidCents)} / ${formatEuros(entry.amountDueCents)}`,
    remainingLabel:
      entry.remainingCents > 0
        ? `Reste ${formatEuros(entry.remainingCents)}`
        : null,
    sectionLabel: showSection
      ? entry.sections.map((section) => section.name).join(", ") ||
        "Sans section"
      : null,
    percent: progressPercent(entry.paidCents, entry.amountDueCents ?? 0),
    reminderStateLabel: owesSomething
      ? formatReminderState(entry.reminder.count, lastRemindedAt, now)
      : null,
    isReminderEligible: eligible,
    reminderCooldownNotice:
      owesSomething && !eligible && lastRemindedAt !== null
        ? formatCooldownNotice(lastRemindedAt, now)
        : null,
    payments: entry.payments.map((payment) => ({
      id: payment.id,
      amountLabel: formatEuros(payment.amountCents),
      dateLabel: formatLongDate(payment.paidAt),
      methodLabel: payment.paymentMethod ? formatPaymentMethod(payment.paymentMethod) : null,
    })),
  };
}
