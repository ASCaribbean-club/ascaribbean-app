import { IconChevronDown } from "@tabler/icons-react";
import { Button } from "@presentation/shared/components/ui/button";
import type { OwedBlockView } from "../finances-view";
import { useOwedBlockViewModel } from "../useOwedBlockViewModel";

interface OwedBlockProps {
  view: OwedBlockView;
  // can('expense_reimbursement:update') && treasurer view, from the ViewModel.
  // Absent (never greyed): the rows are then static, with no detail.
  canUpdateReimbursement: boolean;
  onMarkReimbursed: (advanceId: string) => void;
}

// specs/finances-member-advances.md A6 — "À rembourser": a debt towards members
// (not a cash balance), all seasons, unreimbursed advances only. Read-only for
// every role but the treasurer: static name/amount rows. For the treasurer a row
// is a disclosure button (`aria-expanded`) revealing that member's advances,
// each with "Marquer remboursée" (a sibling of the row button, never nested).
// Amounts are neutral text (no red/green). The ViewModel passes `null` when
// nothing is owed, in which case the parent renders nothing at all.
export function OwedBlock({ view, canUpdateReimbursement, onMarkReimbursed }: OwedBlockProps) {
  const owed = useOwedBlockViewModel(view);

  return (
    <section className="flex min-w-0 flex-col gap-1">
      <div className="flex min-w-0 items-baseline justify-between gap-3">
        <h2 className="min-w-0 text-lg font-extrabold">À rembourser</h2>
        <p aria-label={view.totalAriaLabel} className="shrink-0 text-[16px] font-extrabold whitespace-nowrap">
          {view.totalLabel}
        </p>
      </div>

      <ul className="flex flex-col">
        {view.members.map((member) => {
          const isExpanded = owed.isExpanded(member.userId);
          const rowContent = (
            <>
              <span className="min-w-0 flex-1 truncate text-left text-[15px] font-bold">{member.name}</span>
              <span className="shrink-0 text-[15px] font-bold whitespace-nowrap">{member.owedLabel}</span>
            </>
          );
          return (
            <li key={member.userId} className="flex min-w-0 flex-col border-b border-white/10">
              {canUpdateReimbursement ? (
                <button
                  type="button"
                  onClick={() => owed.toggle(member.userId)}
                  aria-expanded={isExpanded}
                  className="flex min-h-11 w-full min-w-0 items-center gap-3 py-3 text-white active:bg-white/5"
                >
                  {rowContent}
                  <IconChevronDown
                    aria-hidden
                    className={`size-4 shrink-0 text-white/40 transition-transform ${isExpanded ? "rotate-180" : ""}`}
                  />
                </button>
              ) : (
                <div className="flex min-w-0 items-center gap-3 py-3">{rowContent}</div>
              )}

              {canUpdateReimbursement && isExpanded && (
                <ul className="flex flex-col gap-3 pb-3">
                  {member.advances.map((advance) => (
                    <li key={advance.id} className="flex min-w-0 flex-col gap-2 rounded-xl bg-white/5 p-3">
                      <div className="flex min-w-0 items-baseline justify-between gap-3">
                        <p className="min-w-0 truncate text-[14.5px] font-semibold">{advance.label}</p>
                        <p className="shrink-0 text-[14.5px] font-bold whitespace-nowrap">{advance.amountLabel}</p>
                      </div>
                      <p className="text-[13px] text-white/60">{advance.detail}</p>
                      <Button
                        type="button"
                        variant="outline"
                        onClick={() => onMarkReimbursed(advance.id)}
                        aria-label={`Marquer remboursée l'avance ${advance.label}`}
                        className="h-11 w-full rounded-full border-white/20 bg-white/5 font-semibold text-white hover:bg-white/10"
                      >
                        Marquer remboursée
                      </Button>
                    </li>
                  ))}
                </ul>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}
