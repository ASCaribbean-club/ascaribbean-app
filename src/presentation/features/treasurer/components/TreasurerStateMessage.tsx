import { Button } from "@presentation/shared/components/ui/button";

interface TreasurerStateMessageProps {
  message: string;
  onRetry?: () => void;
}

// Explicit fallback shared by both screens (no season, no membership,
// read error): never a silent empty list or an endless loader (AC-TR-09).
export function TreasurerStateMessage({
  message,
  onRetry,
}: TreasurerStateMessageProps) {
  return (
    <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
      <p
        role={onRetry ? "alert" : "status"}
        className="text-[14px] text-white/80"
      >
        {message}
      </p>
      {onRetry && (
        <Button
          type="button"
          variant="outline"
          onClick={onRetry}
          className="h-11 border-white/20 text-white"
        >
          Réessayer
        </Button>
      )}
    </div>
  );
}
