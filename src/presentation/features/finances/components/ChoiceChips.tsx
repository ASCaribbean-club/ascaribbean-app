import type { ReactNode } from "react";
import { Button } from "@presentation/shared/components/ui/button";

export interface ChoiceChipOption {
  id: string;
  label: string;
  // Optional leading decoration (a category colour dot).
  leading?: ReactNode;
}

interface ChoiceChipsProps {
  legend: string;
  options: ChoiceChipOption[];
  selectedId: string | null;
  onSelect: (id: string) => void;
  disabled?: boolean;
  // Extra control rendered at the end of the row (the "+ Nouvelle" chip).
  trailing?: ReactNode;
}

// specs/mob-treasurer-finances.md §4 — single-choice chips that WRAP (no
// horizontal scroll inside a sheet), `h-11` touch targets. The chosen state is
// carried by `aria-pressed` and a solid fill, never by colour alone.
export function ChoiceChips({
  legend,
  options,
  selectedId,
  onSelect,
  disabled,
  trailing,
}: ChoiceChipsProps) {
  return (
    <fieldset className="flex min-w-0 flex-col gap-2" disabled={disabled}>
      <legend className="mb-2 text-[11.5px] font-bold tracking-wider text-white/45 uppercase">
        {legend}
      </legend>
      <div className="flex flex-wrap gap-2">
        {options.map((option) => {
          const isSelected = option.id === selectedId;
          return (
            <Button
              key={option.id}
              type="button"
              variant="outline"
              aria-pressed={isSelected}
              onClick={() => onSelect(option.id)}
              className={`h-11 max-w-full min-w-0 gap-2 rounded-full px-4 text-[14px] font-semibold ${
                isSelected
                  ? "border-white bg-white text-black hover:bg-white"
                  : "border-white/15 bg-white/5 text-white/80 hover:bg-white/10"
              }`}
            >
              {option.leading}
              <span className="truncate">{option.label}</span>
            </Button>
          );
        })}
        {trailing}
      </div>
    </fieldset>
  );
}
