import { Input } from "@presentation/shared/components/ui/input";

interface AmountFieldProps {
  id: string;
  label: string;
  value: string;
  onChange: (value: string) => void;
  hint?: string | null;
  disabled?: boolean;
  placeholder?: string;
  // "large" = the big amount field of the expense sheet; "regular" = h-11.
  size?: "large" | "regular";
}

// specs/mob-treasurer-finances.md §4/§7 — numeric amount in euros, decimal
// keyboard, "€" on the right. `min-w-0` so it shrinks beside a sibling.
export function AmountField({
  id,
  label,
  value,
  onChange,
  hint,
  disabled,
  placeholder = "0",
  size = "regular",
}: AmountFieldProps) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-1.5">
      <label
        htmlFor={id}
        className={
          size === "large"
            ? "text-[11.5px] font-bold tracking-wider text-white/45 uppercase"
            : "sr-only"
        }
      >
        {label}
      </label>
      <div className="relative min-w-0">
        <Input
          id={id}
          type="text"
          inputMode="decimal"
          autoComplete="off"
          disabled={disabled}
          value={value}
          placeholder={placeholder}
          onChange={(event) => onChange(event.target.value)}
          aria-invalid={hint ? true : undefined}
          aria-describedby={hint ? `${id}-hint` : undefined}
          className={`min-w-0 rounded-xl border-white/15 bg-white/5 pr-9 font-bold text-white placeholder:text-white/30 ${
            size === "large" ? "h-14 text-2xl" : "h-11 text-base"
          }`}
        />
        <span
          aria-hidden
          className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-white/60"
        >
          €
        </span>
      </div>
      {hint && (
        <p id={`${id}-hint`} className="text-xs text-red-300">
          {hint}
        </p>
      )}
    </div>
  );
}
