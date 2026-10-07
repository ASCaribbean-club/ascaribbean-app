import { Button } from "@presentation/shared/components/ui/button";
import type { ExpensesTabView } from "../finances-view";
import { ExpenseLine } from "./ExpenseLine";
import { ExpensesSummaryCard } from "./ExpensesSummaryCard";

interface ExpensesTabProps {
  view: ExpensesTabView;
  categoryFilterId: string | null;
  // Rendered only when the ViewModel says the treasurer can record (AC-FI-03).
  canRecordExpense: boolean;
  // Rendered interactive only when the ViewModel says so (canUpdateExpense).
  canUpdateExpense: boolean;
  onEditExpense: (expenseId: string) => void;
  onSelectCategory: (id: string | null) => void;
  onShowMore: () => void;
  onAdd: () => void;
}

// specs/mob-treasurer-finances.md §3 — summary card, filter chips (list only),
// "Dernières dépenses". The floating "+" is absent (not greyed) without
// canRecordExpense, and so is the bottom space reserved for it.
export function ExpensesTab({
  view,
  categoryFilterId,
  canRecordExpense,
  canUpdateExpense,
  onEditExpense,
  onSelectCategory,
  onShowMore,
  onAdd,
}: ExpensesTabProps) {
  return (
    <div className={`flex min-w-0 flex-col gap-4 ${canRecordExpense ? "pb-24" : ""}`}>
      <ExpensesSummaryCard view={view} />

      {!view.hasExpenses ? (
        <p role="status" className="text-[14px] text-white/70">
          Aucune dépense enregistrée cette saison.
          {canRecordExpense ? " Touche + pour en ajouter." : ""}
        </p>
      ) : (
        <>
          <div
            role="group"
            aria-label="Filtrer par catégorie"
            className="-mx-5.5 flex gap-2 overflow-x-auto px-5.5"
          >
            {view.filters.map((filter) => {
              const isSelected = filter.id === categoryFilterId;
              return (
                <Button
                  key={filter.id ?? "all"}
                  type="button"
                  variant="outline"
                  aria-pressed={isSelected}
                  onClick={() => onSelectCategory(filter.id)}
                  className={`h-11 shrink-0 rounded-full px-4 text-[14px] font-semibold ${
                    isSelected
                      ? "border-white bg-white text-black hover:bg-white"
                      : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
                  }`}
                >
                  {filter.label}
                </Button>
              );
            })}
          </div>

          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <h2 className="min-w-0 truncate text-lg font-extrabold">Dernières dépenses</h2>
            <p className="shrink-0 text-[13px] text-white/60">{view.countLabel}</p>
          </div>

          <ul className="flex flex-col">
            {view.lines.map((line) => (
              // An expense of an archived carrier is locked (PO-FA-13): static line.
              <ExpenseLine key={line.id} line={line} onEdit={canUpdateExpense && !line.isLocked ? onEditExpense : undefined} />
            ))}
          </ul>

          {view.hasMore && (
            <Button
              type="button"
              variant="outline"
              onClick={onShowMore}
              className="h-11 w-full rounded-full border-white/15 bg-white/5 font-semibold text-white hover:bg-white/10"
            >
              Afficher plus
            </Button>
          )}
        </>
      )}

      {canRecordExpense && (
        <Button
          type="button"
          onClick={onAdd}
          aria-label="Nouvelle dépense"
          className="fixed right-5.5 bottom-24 z-20 size-14 rounded-full bg-coach-red text-3xl font-light text-white shadow-lg hover:bg-coach-red"
        >
          +
        </Button>
      )}
    </div>
  );
}
