import { Button } from "@presentation/shared/components/ui/button";

interface SelectionBarProps {
  countLabel: string;
  areAllSelected: boolean;
  canSend: boolean;
  isBusy: boolean;
  onToggleAll: () => void;
  onSend: () => void;
}

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (4), (a) point 4 —
// bottom bar of the selection mode. `sticky bottom-24` (= the pb-24 the
// AppShell reserves for the fixed BottomNav) keeps it ABOVE the nav, which is
// neither hidden nor modified (UI-TR-12). Opaque background, h-11 targets,
// min-w-0 on every element, labels never wrapping. "Relancer" is inactive at
// 0 selected (a state, not a right: the button stays visible).
export function SelectionBar({
  countLabel,
  areAllSelected,
  canSend,
  isBusy,
  onToggleAll,
  onSend,
}: SelectionBarProps) {
  return (
    <div className="sticky bottom-24 z-10 px-5.5">
      <div className="flex min-w-0 items-center gap-2 rounded-full border border-white/15 bg-coach-bg p-2 pl-4 shadow-lg">
        <span
          role="status"
          className="min-w-0 flex-1 truncate text-[13px] font-bold whitespace-nowrap text-white"
        >
          {countLabel}
        </span>
        <Button
          type="button"
          variant="outline"
          onClick={onToggleAll}
          disabled={isBusy}
          className="h-11 min-w-0 shrink rounded-full border-white/20 bg-transparent px-4 whitespace-nowrap text-white"
        >
          {areAllSelected ? "Aucun" : "Tout"}
        </Button>
        <Button
          type="button"
          onClick={onSend}
          disabled={!canSend || isBusy}
          className="h-11 min-w-0 shrink rounded-full bg-amber-500 px-5 font-bold whitespace-nowrap text-black hover:bg-amber-400"
        >
          Relancer
        </Button>
      </div>
    </div>
  );
}
