import type { MembershipPaymentStatus } from "@domain/rules/membership-payment-rules";
import { cn } from "@presentation/shared/lib/utils";

const STATUS_CLASSNAMES: Record<MembershipPaymentStatus, string> = {
  paid: "bg-emerald-500/15 text-emerald-300",
  partial: "bg-amber-500/15 text-amber-300",
  unpaid: "bg-red-500/15 text-red-300",
  undefined: "bg-white/10 text-white/70",
};

interface PaymentStatusBadgeProps {
  status: MembershipPaymentStatus;
  label: string;
}

// Status always carries its text label: colour is never the only signal (AC-TR-19).
export function PaymentStatusBadge({ status, label }: PaymentStatusBadgeProps) {
  return (
    <span
      className={cn(
        "shrink-0 rounded-full px-2.5 py-1 text-[11.5px] font-bold",
        STATUS_CLASSNAMES[status],
      )}
    >
      {label}
    </span>
  );
}
