import { Button } from "@presentation/shared/components/ui/button";

interface ReminderRowProps {
  memberName: string;
  // null = settled card: nothing rendered at all.
  stateLabel: string | null;
  // Rendered only when the ViewModel's canRemind is true AND the membership
  // is eligible (absent, never greyed).
  showButton: boolean;
  // Replaces the button during the 7-day window: normal text, no lock icon,
  // no disabled button (a state of the membership, not a missing right).
  cooldownNotice: string | null;
  isBusy: boolean;
  onRemind: () => void;
}

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (4), (a) point 1 —
// the reminder row of a card: state line on the left (min-w-0, may wrap),
// "Relancer" on the right (shrink-0, h-11). It is a SIBLING of the card's
// expand zone, never its child, so tapping "Relancer" does not toggle it.
export function ReminderRow({
  memberName,
  stateLabel,
  showButton,
  cooldownNotice,
  isBusy,
  onRemind,
}: ReminderRowProps) {
  if (stateLabel === null) return null;

  return (
    <div className="flex min-w-0 items-center justify-between gap-3 px-3.5 pb-3">
      <div className="flex min-w-0 flex-1 flex-col gap-0.5 text-[12.5px]">
        <span className="font-semibold text-amber-200">{stateLabel}</span>
        {cooldownNotice && (
          <span className="text-white/70">{cooldownNotice}</span>
        )}
      </div>
      {showButton && (
        <Button
          type="button"
          variant="outline"
          onClick={onRemind}
          disabled={isBusy}
          aria-label={`Relancer ${memberName}`}
          className="h-11 shrink-0 rounded-full border-amber-300/50 bg-transparent px-4 font-bold text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
        >
          Relancer
        </Button>
      )}
    </div>
  );
}
