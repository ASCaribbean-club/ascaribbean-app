import { IconCheck } from "@tabler/icons-react";
import { cn } from "@presentation/shared/lib/utils";
import { CollectionProgressBar } from "../../components/CollectionProgressBar";
import { PaymentStatusBadge } from "../../components/PaymentStatusBadge";
import type { DueView } from "../../due-view";

interface SelectableDueCardProps {
  due: DueView;
  // false = reminded less than 7 days ago: listed, no checkbox, no reaction
  // to a tap, a notice in place of the secondary line.
  isSelectable: boolean;
  isSelected: boolean;
  onToggle: () => void;
}

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (4), (a) point 4 —
// reduced card of the selection mode (exports 5/6): round checkbox, name,
// status pill, bar, amounts. No expand, no state line, no payment button. The
// WHOLE card is the target (role="checkbox"); the tick is a glyph, so the
// selection never relies on colour alone.
export function SelectableDueCard({
  due,
  isSelectable,
  isSelected,
  onToggle,
}: SelectableDueCardProps) {
  const content = (
    <>
      <span className="flex min-w-0 items-center gap-3">
        {/* The slot is kept for a non-selectable card so names stay aligned. */}
        <span
          aria-hidden
          className={cn(
            "flex size-6 shrink-0 items-center justify-center rounded-full",
            isSelectable && "border-2 border-white/40",
            isSelectable && isSelected && "border-amber-500 bg-amber-500",
          )}
        >
          {isSelectable && isSelected && (
            <IconCheck className="size-4 text-black" strokeWidth={3} />
          )}
        </span>
        <span className="min-w-0 flex-1 truncate text-[15px] font-bold text-white">
          {due.name}
        </span>
        <PaymentStatusBadge status={due.status} label={due.statusLabel} />
      </span>
      <CollectionProgressBar
        percent={due.percent}
        label={`${due.name} : ${due.percent}% payé`}
      />
      <span className="flex min-w-0 items-center justify-between gap-3 text-[12.5px] text-white/70">
        <span className="min-w-0 truncate">
          {due.reminderCooldownNotice ??
            `${due.sectionLabel ? `${due.sectionLabel} · ` : ""}${due.remainingLabel ?? ""}`}
        </span>
        <span className="shrink-0 font-semibold text-white">
          {due.amountsLabel}
        </span>
      </span>
    </>
  );

  const className = "flex min-h-11 w-full min-w-0 flex-col gap-2 rounded-2xl p-3.5 text-left";

  return (
    <li
      className={cn(
        "rounded-2xl border border-white/10 bg-white/5",
        isSelected && "border-amber-400/60",
      )}
    >
      {isSelectable ? (
        <button
          type="button"
          role="checkbox"
          aria-checked={isSelected}
          aria-label={due.name}
          onClick={onToggle}
          className={className}
        >
          {content}
        </button>
      ) : (
        <div className={className}>{content}</div>
      )}
    </li>
  );
}
