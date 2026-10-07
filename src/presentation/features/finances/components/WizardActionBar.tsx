import { Button } from "@presentation/shared/components/ui/button";

interface WizardActionBarProps {
  // Step 1 has no "Retour": "Suivant" takes the whole width (mockup 1).
  showBack: boolean;
  onBack: () => void;
  // "Suivant", or the save label on the last step.
  primaryLabel: string;
  // The save label while sending.
  submittingLabel: string;
  isSubmitting: boolean;
  isLastStep: boolean;
  canProceed: boolean;
  onNext: () => void;
  // Disables "Retour" while sending.
  isBusy: boolean;
}

// specs/finances-member-advances.md A1/AC-FA-30 — the two buttons side by side,
// `h-12`, `min-w-0` on each: "Retour" (light outline, its own width) and the
// main action (`flex-1`, red when active, dark grey when inactive). The bar
// itself is the `sticky bottom-0` one of FinanceSheet.
export function WizardActionBar({
  showBack,
  onBack,
  primaryLabel,
  submittingLabel,
  isSubmitting,
  isLastStep,
  canProceed,
  onNext,
  isBusy,
}: WizardActionBarProps) {
  return (
    <div className="flex min-w-0 gap-3">
      {showBack && (
        <Button
          type="button"
          variant="outline"
          onClick={onBack}
          disabled={isBusy}
          className="h-12 min-w-0 shrink-0 rounded-full border-white/25 bg-transparent px-6 text-[15px] font-semibold text-white hover:bg-white/10"
        >
          Retour
        </Button>
      )}
      <Button
        // The last step submits the form; earlier ones just advance.
        type={isLastStep ? "submit" : "button"}
        onClick={isLastStep ? undefined : onNext}
        disabled={!canProceed}
        className="h-12 min-w-0 flex-1 rounded-full bg-coach-red text-[15px] font-bold text-white hover:bg-coach-red disabled:bg-white/10 disabled:text-white/40 disabled:opacity-100"
      >
        {isSubmitting ? submittingLabel : primaryLabel}
      </Button>
    </div>
  );
}
