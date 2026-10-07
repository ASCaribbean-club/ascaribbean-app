import type { OutstandingAdvance } from "@domain/entities/finance";
import { Button } from "@presentation/shared/components/ui/button";
import { Input } from "@presentation/shared/components/ui/input";
import { useReimbursementSheetViewModel } from "../useReimbursementSheetViewModel";
import { ChoiceChips } from "./ChoiceChips";
import { FinanceSheet } from "./FinanceSheet";
import { WizardActionBar } from "./WizardActionBar";

interface ReimbursementSheetProps {
  advance: OutstandingAdvance;
  memberName: string;
  today: string;
  onClose: () => void;
}

// specs/finances-member-advances.md A6 — "Marquer remboursée", one step in the
// same FinanceSheet frame: the date (today by default) and the method of the
// reimbursement, stacked. Mounted only for the treasurer in treasurer view.
export function ReimbursementSheet({ advance, memberName, today, onClose }: ReimbursementSheetProps) {
  const vm = useReimbursementSheetViewModel({ advance, memberName, today, onClose });

  return (
    <FinanceSheet
      title={vm.title}
      description={vm.description}
      submitLabel="Marquer comme remboursée"
      submittingLabel="Enregistrement…"
      canSubmit={vm.canSubmit}
      isSubmitting={vm.isSubmitting}
      errorMessage={vm.errorMessage}
      isDirty={vm.paymentMethod !== null}
      onCancel={onClose}
      onSubmit={vm.submit}
      actionBar={
        vm.isGone ? (
          <Button
            type="button"
            onClick={onClose}
            className="h-12 w-full rounded-full bg-coach-red text-[15px] font-bold text-white hover:bg-coach-red"
          >
            Fermer
          </Button>
        ) : (
          <WizardActionBar
            showBack={false}
            onBack={onClose}
            primaryLabel="Marquer comme remboursée"
            submittingLabel="Enregistrement…"
            isSubmitting={vm.isSubmitting}
            isLastStep
            canProceed={vm.canSubmit}
            onNext={vm.submit}
            isBusy={vm.isSubmitting}
          />
        )
      }
    >
      <div className="flex min-w-0 flex-col gap-1.5">
        <label
          htmlFor="reimbursement-date"
          className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase"
        >
          Date du remboursement
        </label>
        <Input
          id="reimbursement-date"
          type="date"
          min={vm.minReimbursedOn}
          max={vm.maxReimbursedOn}
          value={vm.reimbursedOn}
          disabled={vm.isSubmitting}
          onChange={(event) => vm.setReimbursedOn(event.target.value)}
          aria-invalid={vm.dateMessage ? true : undefined}
          className="h-11 w-full min-w-0 rounded-xl border-white/15 bg-white/5 text-white"
        />
        {vm.dateMessage && <p className="text-xs text-red-300">{vm.dateMessage}</p>}
      </div>
      <ChoiceChips
        legend="Mode de paiement · du remboursement"
        disabled={vm.isSubmitting}
        selectedId={vm.paymentMethod}
        onSelect={vm.selectPaymentMethod}
        options={vm.methodOptions}
      />
    </FinanceSheet>
  );
}
