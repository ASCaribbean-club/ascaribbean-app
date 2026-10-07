import { Input } from "@presentation/shared/components/ui/input";
import type { ExpenseSheetViewModel } from "../useExpenseSheetViewModel";
import { ChoiceChips } from "./ChoiceChips";
import { MemberPicker } from "./MemberPicker";

// specs/finances-member-advances.md A2 step 3 — "Avancé par un membre ?"
// (Non preselected). Non: active carriers then the payment method, both
// required. Oui: the carrier chips and their method group DISAPPEAR; instead the
// member picker, then "Remboursement" (À rembourser preselected, no other field)
// or "Remboursé" (reimbursement date, today by default, then the method of the
// reimbursement). Date and method are STACKED, never side by side.
export function ExpensePaymentStep({ vm }: { vm: ExpenseSheetViewModel }) {
  return (
    <>
      {vm.canChooseMember && (
        <ChoiceChips
          legend="Avancé par un membre ?"
          disabled={vm.isSubmitting}
          selectedId={vm.isAdvance ? "yes" : "no"}
          onSelect={vm.selectAdvance}
          options={vm.advanceOptions}
        />
      )}

      {!vm.isAdvance && (
        <>
          <ChoiceChips
            legend="Porteur · d'où sort l'argent"
            disabled={vm.isSubmitting}
            selectedId={vm.carrierId}
            onSelect={vm.selectCarrier}
            options={vm.carrierOptions}
          />
          <ChoiceChips
            legend="Mode de paiement"
            disabled={vm.isSubmitting}
            selectedId={vm.paymentMethod}
            onSelect={vm.selectPaymentMethod}
            options={vm.methodOptions}
          />
        </>
      )}

      {vm.isAdvance && (
        <>
          <MemberPicker picker={vm.memberPicker} disabled={vm.isSubmitting} />

          <div className="flex min-w-0 flex-col gap-2">
            <ChoiceChips
              legend="Remboursement"
              disabled={vm.isSubmitting}
              selectedId={vm.reimbursementChoice}
              onSelect={vm.selectReimbursement}
              options={vm.reimbursementOptions}
            />
            {!vm.isReimbursed && (
              <p className="text-xs text-white/60">Aucun solde de porteur n'est modifié.</p>
            )}
          </div>

          {vm.isReimbursed && (
            <>
              <div className="flex min-w-0 flex-col gap-1.5">
                <label
                  htmlFor="expense-reimbursed-on"
                  className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase"
                >
                  Date du remboursement
                </label>
                <Input
                  id="expense-reimbursed-on"
                  type="date"
                  min={vm.minReimbursedOn}
                  max={vm.maxReimbursedOn}
                  value={vm.reimbursedOn}
                  disabled={vm.isSubmitting}
                  onChange={(event) => vm.setReimbursedOn(event.target.value)}
                  aria-invalid={vm.reimbursementDateMessage ? true : undefined}
                  className="h-11 w-full min-w-0 rounded-xl border-white/15 bg-white/5 text-white"
                />
                {vm.reimbursementDateMessage && (
                  <p className="text-xs text-red-300">{vm.reimbursementDateMessage}</p>
                )}
              </div>
              <ChoiceChips
                legend="Mode de paiement · du remboursement"
                disabled={vm.isSubmitting}
                selectedId={vm.reimbursementMethod}
                onSelect={vm.selectReimbursementMethod}
                options={vm.methodOptions}
              />
            </>
          )}
        </>
      )}
    </>
  );
}
