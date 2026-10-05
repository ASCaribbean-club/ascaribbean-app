import { Progress } from "@presentation/shared/components/ui/progress";
import { cn } from "@presentation/shared/lib/utils";

interface CollectionProgressBarProps {
  percent: number;
  label: string;
  indicatorClassName?: string;
}

// Decorative: the amount and percentage are always also rendered as text
// next to it (AC-TR-19), so the bar alone is never the only signal.
export function CollectionProgressBar({
  percent,
  label,
  indicatorClassName,
}: CollectionProgressBarProps) {
  return (
    <Progress
      value={percent}
      aria-label={label}
      className={cn(
        "h-1.5 bg-white/10 *:data-[slot=progress-indicator]:bg-emerald-400",
        indicatorClassName,
      )}
    />
  );
}
