import type { Expense, FinancesSnapshot } from "@domain/entities/finance";
import { useExpenseSheetViewModel } from "../useExpenseSheetViewModel";
import { ExpenseAmountStep } from "./ExpenseAmountStep";
import { ExpenseCategoryStep } from "./ExpenseCategoryStep";
import { ExpensePaymentStep } from "./ExpensePaymentStep";
import { ExpenseRecapStep } from "./ExpenseRecapStep";
import { ExpenseStepHeader } from "./ExpenseStepHeader";
import { FinanceSheet } from "./FinanceSheet";
import { WizardActionBar } from "./WizardActionBar";

interface ExpenseSheetProps {
  snapshot: FinancesSnapshot;
  today: string;
  // Present = "Modifier la dépense" (specs/mob-treasurer-finances-edit.md §3).
  expense?: Expense;
  canDeleteExpense: boolean;
  canRenameCategory: boolean;
  canDeleteCategory: boolean;
  onClose: () => void;
}

// specs/finances-member-advances.md D-A7 — "Nouvelle dépense" and "Modifier la
// dépense" are the same four-step wizard (Montant, Catégorie, Paiement, Récap).
// Mounted only while open (treasurer only), so the form always starts fresh (or
// prefilled from `expense`). No logic here: every branch reads the ViewModel.
export function ExpenseSheet({
  snapshot,
  today,
  expense,
  canDeleteExpense,
  canRenameCategory,
  canDeleteCategory,
  onClose,
}: ExpenseSheetProps) {
  const vm = useExpenseSheetViewModel({
    snapshot,
    today,
    expense,
    canDeleteExpense,
    canRenameCategory,
    canDeleteCategory,
    onRecorded: onClose,
  });

  return (
    <FinanceSheet
      showHandle
      title={vm.title}
      description={`Saison ${vm.seasonLabel}`}
      stepHeader={<ExpenseStepHeader steps={vm.steps} />}
      submitLabel={vm.submitLabel}
      submittingLabel="Enregistrement…"
      canSubmit={vm.isLastStep ? vm.canSubmit : vm.canGoNext}
      isSubmitting={vm.isSubmitting}
      errorMessage={vm.errorMessage}
      isDirty={vm.isDirty}
      onCancel={onClose}
      onSubmit={vm.isLastStep ? vm.submit : vm.goNext}
      // "Supprimer" lives on the recap only: it concerns the whole expense.
      deletion={vm.isLastStep ? vm.deletion : undefined}
      actionBar={
        <WizardActionBar
          showBack={!vm.isFirstStep}
          onBack={vm.goBack}
          primaryLabel={vm.isLastStep ? vm.submitLabel : "Suivant"}
          submittingLabel="Enregistrement…"
          isSubmitting={vm.isSubmitting}
          isLastStep={vm.isLastStep}
          canProceed={vm.isLastStep ? vm.canSubmit : vm.canGoNext}
          onNext={vm.goNext}
          isBusy={vm.isSubmitting}
        />
      }
    >
      {vm.step === "amount" && <ExpenseAmountStep vm={vm} />}
      {vm.step === "category" && <ExpenseCategoryStep vm={vm} />}
      {vm.step === "payment" && <ExpensePaymentStep vm={vm} />}
      {vm.step === "recap" && <ExpenseRecapStep vm={vm} />}
    </FinanceSheet>
  );
}
