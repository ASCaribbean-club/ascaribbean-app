import { IconChevronRight } from "@tabler/icons-react";
import { categoryColor } from "../category-palette";
import type { ExpenseLineView } from "../finances-view";

interface ExpenseLineProps {
  line: ExpenseLineView;
  // Passed only when canUpdateExpense (treasurer view): the line is then a
  // button. Absent, the line is the plain read-only one, with NO chevron and no
  // room reserved for it (specs/mob-treasurer-finances-edit.md AC-FIE-02).
  onEdit?: (expenseId: string) => void;
}

// specs/mob-treasurer-finances.md §3 point 4 — dense line. Text columns shrink
// and truncate; the amount column keeps its width (`shrink-0`), and so does the
// chevron of the interactive variant (edit spec §3).
export function ExpenseLine({ line, onEdit }: ExpenseLineProps) {
  const content = (
    <>
      <span
        aria-hidden
        className={`w-1 shrink-0 rounded-full ${categoryColor(line.colorIndex).bar}`}
      />
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-left">
        <p className="truncate text-[15px] font-bold">{line.label}</p>
        <p className="truncate text-[13px] text-white/60">{line.meta}</p>
        {/* An advance: its state is carried by TEXT, amber is only a reinforcement. */}
        {line.stateLabel && (
          <p
            className={`min-w-0 truncate text-[13px] ${
              line.stateTone === "to-reimburse" ? "font-semibold text-amber-300" : "text-white/60"
            }`}
          >
            {line.stateLabel}
          </p>
        )}
      </div>
      <div className="flex shrink-0 flex-col items-end gap-0.5">
        <p className="text-[15px] font-bold whitespace-nowrap text-coach-red-text">
          {line.amountLabel}
        </p>
        <p
          className={`line-clamp-2 text-right text-[13px] text-white/60 ${
            line.stateLabel ? "max-w-40" : "max-w-32"
          }`}
        >
          {line.payerLabel}
        </p>
      </div>
      {onEdit && (
        <IconChevronRight aria-hidden className="size-4 shrink-0 self-center text-white/40" />
      )}
    </>
  );

  if (!onEdit) {
    return <li className="flex min-w-0 items-stretch gap-3 border-b border-white/10 py-3">{content}</li>;
  }

  return (
    <li className="border-b border-white/10">
      <button
        type="button"
        onClick={() => onEdit(line.id)}
        aria-label={`Modifier la dépense ${line.label}`}
        className="flex min-h-11 w-full min-w-0 items-stretch gap-3 py-3 text-white active:bg-white/5"
      >
        {content}
      </button>
    </li>
  );
}
