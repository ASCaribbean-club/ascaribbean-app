import { IconChevronDown, IconPlus } from "@tabler/icons-react";
import { Button } from "@presentation/shared/components/ui/button";
import { cn } from "@presentation/shared/lib/utils";
import { CollectionProgressBar } from "../../components/CollectionProgressBar";
import { PaymentStatusBadge } from "@presentation/shared/components/PaymentStatusBadge";
import type { DueView } from "../../due-view";
import { ReminderRow } from "../../components/ReminderRow";

interface DueCardProps {
  due: DueView;
  isExpanded: boolean;
  onToggle: () => void;
  // Rendered only when the ViewModel's canRecordPayment is true (absent, never
  // greyed, for a read-only authorized-officer).
  canRecordPayment: boolean;
  onAddPayment: () => void;
  // specs/mobile-treasurer.md amendement (4): the "Relancer" button is absent
  // (not greyed) without it; the state line stays for a read-only role.
  canRemind: boolean;
  isReminderBusy: boolean;
  onRemind: () => void;
}

// Expandable card: the whole header is the toggle (min h-11). Expanded:
// payment history, most recent first, each with its payment method when
// recorded, then "+ Ajouter un paiement" for a role that can record one
// (amendement UI du 2026-10-05 (3)). The reminder row (state line + "Relancer"
// or the 7-day notice) sits between the header and the history, folded or
// expanded (amendement (4), UI-TR-14). No "Modifier".
export function DueCard({
  due,
  isExpanded,
  onToggle,
  canRecordPayment,
  onAddPayment,
  canRemind,
  isReminderBusy,
  onRemind,
}: DueCardProps) {
  const panelId = `due-payments-${due.id}`;

  return (
    <li className="rounded-2xl border border-white/10 bg-white/5">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={isExpanded}
        aria-controls={panelId}
        className="flex min-h-11 w-full min-w-0 flex-col gap-2 rounded-2xl p-3.5 text-left"
      >
        <span className="flex min-w-0 items-center gap-3">
          <span
            aria-hidden
            className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-bold text-white"
          >
            {due.initials}
          </span>
          <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">
            {due.name}
          </span>
          <PaymentStatusBadge status={due.status} label={due.statusLabel} />
          <IconChevronDown
            aria-hidden
            className={cn(
              "size-4.5 shrink-0 text-white/60 transition-transform",
              isExpanded && "rotate-180",
            )}
          />
        </span>
        <CollectionProgressBar
          percent={due.percent}
          label={`${due.name} : ${due.percent}% payé`}
        />
        <span className="flex min-w-0 items-center justify-between gap-3 text-[12.5px] text-white/70">
          <span className="min-w-0 truncate">
            {due.sectionLabel ? `${due.sectionLabel} · ` : ""}
            {due.remainingLabel ?? "Soldée"}
          </span>
          <span className="shrink-0 font-semibold text-white">
            {due.amountsLabel}
          </span>
        </span>
      </button>

      <ReminderRow
        memberName={due.name}
        stateLabel={due.reminderStateLabel}
        showButton={canRemind && due.isReminderEligible}
        cooldownNotice={due.reminderCooldownNotice}
        isBusy={isReminderBusy}
        onRemind={onRemind}
      />

      {isExpanded && (
        <div
          id={panelId}
          className="flex flex-col gap-2 border-t border-white/10 px-3.5 py-3"
        >
          <h3 className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase">
            Versements
          </h3>
          {due.payments.length === 0 ? (
            <p className="text-[13px] text-white/70">
              Aucun versement enregistré
            </p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {due.payments.map((payment) => (
                <li
                  key={payment.id}
                  className="flex min-w-0 items-baseline justify-between gap-3"
                >
                  <span className="shrink-0 text-[14px] font-extrabold text-white">
                    {payment.amountLabel}
                  </span>
                  <span className="min-w-0 truncate text-[12.5px] text-white/70">
                    {payment.methodLabel ? `${payment.methodLabel}` : ""}
                    {` · ${payment.dateLabel}`}
                  </span>
                </li>
              ))}
            </ul>
          )}
          {canRecordPayment && (
            <Button
              type="button"
              onClick={onAddPayment}
              className="mt-1 h-11 w-full min-w-0 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green"
            >
              <IconPlus aria-hidden />
              Ajouter un paiement
            </Button>
          )}
        </div>
      )}
    </li>
  );
}
