import { IconChevronRight } from "@tabler/icons-react";
import { Button } from "@presentation/shared/components/ui/button";
import type { CarrierRowView } from "../finances-view";

interface CarrierRowProps {
  carrier: CarrierRowView;
  // Rendered only when canRecordOpeningBalance AND the balance is missing.
  canEnterOpeningBalance: boolean;
  onEnterOpeningBalance: (carrierId: string) => void;
  // specs/mob-treasurer-finances-edit.md §5 — canUpdateOpeningBalance AND a
  // balance already entered: the whole row becomes a button. Never together
  // with the "Saisir" button (no button inside a button).
  canEditOpeningBalance: boolean;
  onEditOpeningBalance: (carrierId: string) => void;
}

// specs/mob-treasurer-finances.md §5 point 4 / §6 — one line per carrier. Name
// and detail shrink and truncate (`min-w-0`); the balance keeps its width.
// "Solde d'ouverture non saisi" is a TEXT mention for every role; the "Saisir"
// button sits under the line, only for the treasurer.
export function CarrierRow({
  carrier,
  canEnterOpeningBalance,
  onEnterOpeningBalance,
  canEditOpeningBalance,
  onEditOpeningBalance,
}: CarrierRowProps) {
  // An archived carrier is never interactive, even for the treasurer (A7).
  const isEditable = canEditOpeningBalance && !carrier.openingMissing && !carrier.isArchived;
  const content = (
    <>
      <span
        aria-hidden
        className="flex size-10 shrink-0 items-center justify-center rounded-full bg-white/10 text-[12px] font-extrabold"
      >
        {carrier.badge}
      </span>
      <div className="flex min-w-0 flex-1 flex-col gap-0.5">
        <p className="truncate text-[15px] font-bold">{carrier.name}</p>
        <p className="truncate text-[13px] text-white/60">{carrier.detail}</p>
        {carrier.isArchived && (
          <p className="w-fit rounded-full border border-white/15 bg-white/10 px-2.5 py-0.5 text-[11.5px] font-extrabold tracking-wide text-white/70 uppercase">
            Archivé
          </p>
        )}
        {carrier.openingMissing && (
          <p className="text-[13px] font-semibold text-amber-300">
            Solde d'ouverture non saisi
          </p>
        )}
        {carrier.openingLabel && (
          <p className="truncate text-[13px] text-white/60">{carrier.openingLabel}</p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p
          className={`text-[16px] font-extrabold whitespace-nowrap ${
            carrier.isBalanceNegative ? "text-coach-red-text" : ""
          }`}
        >
          {carrier.balanceLabel}
        </p>
        {carrier.lastCountLabel && (
          <p className="text-[12.5px] whitespace-nowrap text-white/60">
            {carrier.lastCountLabel}
          </p>
        )}
      </div>
      {isEditable && (
        <IconChevronRight aria-hidden className="size-4 shrink-0 text-white/40" />
      )}
    </>
  );

  return (
    <li className="flex min-w-0 flex-col gap-2 border-b border-white/10 py-3">
      {isEditable ? (
        <button
          type="button"
          onClick={() => onEditOpeningBalance(carrier.id)}
          aria-label={`Corriger le solde d'ouverture de ${carrier.name}`}
          className="flex min-h-11 w-full min-w-0 items-center gap-3 text-left text-white active:bg-white/5"
        >
          {content}
        </button>
      ) : (
        <div className="flex min-w-0 items-center gap-3">{content}</div>
      )}
      {canEnterOpeningBalance && carrier.openingMissing && !carrier.isArchived && (
        <Button
          type="button"
          variant="outline"
          onClick={() => onEnterOpeningBalance(carrier.id)}
          className="h-11 w-full rounded-full border-white/20 bg-white/5 font-semibold text-white hover:bg-white/10"
        >
          Saisir le solde d'ouverture
        </Button>
      )}
    </li>
  );
}
