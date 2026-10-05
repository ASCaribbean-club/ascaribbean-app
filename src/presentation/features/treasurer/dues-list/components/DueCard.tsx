import { IconChevronDown } from "@tabler/icons-react";
import { cn } from "@presentation/shared/lib/utils";
import { CollectionProgressBar } from "../../components/CollectionProgressBar";
import { PaymentStatusBadge } from "../../components/PaymentStatusBadge";
import type { DueView } from "../../due-view";

interface DueCardProps {
  due: DueView;
  isExpanded: boolean;
  onToggle: () => void;
}

// Read-only expandable card: the whole header is the toggle (min h-11).
// Expanded: payment history, most recent first, each with its payment method
// when recorded — no "Modifier", no "Ajouter un paiement", no reminder state
// (AC-TR-15/16).
export function DueCard({ due, isExpanded, onToggle }: DueCardProps) {
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
        </div>
      )}
    </li>
  );
}
