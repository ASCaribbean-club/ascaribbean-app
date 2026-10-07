import type { ExpenseSheetViewModel } from "../useExpenseSheetViewModel";

interface ExpenseStepHeaderProps {
  steps: ExpenseSheetViewModel["steps"];
}

// specs/finances-member-advances.md A1 — "Montant · Catégorie · Paiement ·
// Récap" as text tabs under the title. The current step is bold white and
// carries `aria-current="step"` (never colour alone), plus an sr-only "Étape n
// sur 4". A reachable step is an `h-11` button; one that cannot be reached yet
// (creation never jumps past the first invalid step) is plain inert text.
export function ExpenseStepHeader({ steps }: ExpenseStepHeaderProps) {
  return (
    <ol className="flex min-w-0 gap-1 border-b border-white/10 px-5.5">
      {steps.map((step) => {
        const tone = step.isCurrent ? "font-extrabold text-white" : step.isReachable ? "font-semibold text-white/70" : "font-semibold text-white/35";
        const content = (
          <>
            {step.label}
            <span className="sr-only"> ({step.srLabel})</span>
          </>
        );
        return (
          <li key={step.id} className="min-w-0 flex-1">
            {step.isReachable ? (
              <button
                type="button"
                onClick={step.onSelect}
                aria-current={step.isCurrent ? "step" : undefined}
                className={`flex h-11 w-full min-w-0 items-center truncate text-left text-[13.5px] ${tone}`}
              >
                {content}
              </button>
            ) : (
              <span
                aria-current={step.isCurrent ? "step" : undefined}
                className={`flex h-11 w-full min-w-0 items-center truncate text-[13.5px] ${tone}`}
              >
                {content}
              </span>
            )}
          </li>
        );
      })}
    </ol>
  );
}
