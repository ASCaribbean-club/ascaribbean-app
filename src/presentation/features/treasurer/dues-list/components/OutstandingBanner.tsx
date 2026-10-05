import { Button } from "@presentation/shared/components/ui/button";

interface OutstandingBannerProps {
  label: string;
  // Rendered only when the ViewModel says so (canRemind and m > 0).
  canRemindAll: boolean;
  isBusy: boolean;
  onRemindAll: () => void;
}

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (4), (a) point 3 —
// "{n} licenciés à relancer — {montant} restant · {m} sans relance depuis 7 j"
// plus "Tout relancer". On a narrow phone the button wraps BELOW the text
// (flex-wrap + a base width on the text) instead of squeezing it.
export function OutstandingBanner({
  label,
  canRemindAll,
  isBusy,
  onRemindAll,
}: OutstandingBannerProps) {
  return (
    <div className="flex min-w-0 flex-wrap items-center justify-between gap-3 rounded-xl border border-amber-300/20 bg-amber-500/10 px-3.5 py-2.5">
      <p className="min-w-0 flex-1 basis-48 text-[13px] font-semibold text-amber-200">
        {label}
      </p>
      {canRemindAll && (
        <Button
          type="button"
          onClick={onRemindAll}
          disabled={isBusy}
          className="h-11 shrink-0 rounded-full bg-amber-500 px-4 font-bold text-black hover:bg-amber-400"
        >
          Tout relancer
        </Button>
      )}
    </div>
  );
}
