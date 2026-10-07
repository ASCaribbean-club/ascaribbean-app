import { IconCheck, IconX } from "@tabler/icons-react";
import { Button } from "@presentation/shared/components/ui/button";
import { Input } from "@presentation/shared/components/ui/input";
import type { ExpenseSheetViewModel } from "../useExpenseSheetViewModel";

interface MemberPickerProps {
  picker: ExpenseSheetViewModel["memberPicker"];
  disabled?: boolean;
}

const LIST_ID = "member-picker-list";

// specs/finances-member-advances.md D-A6/A3 — search field + INLINE results
// (no portal: a popover over a bottom sheet with the keyboard open is fragile on
// mobile). Typing filters (case and accent insensitive, done by the
// ViewModel); only a result can be chosen, free text is never retained. A
// choice collapses the list and "Effacer" (`h-11 w-11`) reopens it. Results show
// the displayable name ONLY. Each result is `min-h-11`; the list is capped at
// about four and a half rows so the half row hints at scrolling.
export function MemberPicker({ picker, disabled }: MemberPickerProps) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <label
        htmlFor="member-picker-input"
        className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase"
      >
        Membre
      </label>
      <div className="relative min-w-0">
        <Input
          id="member-picker-input"
          role="combobox"
          aria-expanded={!picker.hasSelection}
          aria-controls={LIST_ID}
          aria-autocomplete="list"
          autoComplete="off"
          placeholder="Rechercher un membre"
          value={picker.query}
          disabled={disabled}
          onChange={(event) => picker.onQueryChange(event.target.value)}
          className={`h-11 w-full min-w-0 rounded-xl border-white/15 bg-white/5 text-white ${
            picker.hasSelection ? "pr-24 font-semibold" : ""
          }`}
        />
        {picker.hasSelection && (
          <div className="absolute inset-y-0 right-0 flex items-center">
            <IconCheck aria-hidden className="size-4 text-emerald-400" />
            <Button
              type="button"
              variant="ghost"
              onClick={picker.onClear}
              disabled={disabled}
              aria-label="Changer de membre"
              className="size-11 shrink-0 rounded-full text-white/70 hover:bg-white/10"
            >
              <IconX aria-hidden className="size-4" />
            </Button>
          </div>
        )}
      </div>

      {!picker.hasSelection && picker.hasNoResult && (
        <p role="status" className="text-[14px] text-white/60">
          Aucun compte ne correspond.
        </p>
      )}

      {!picker.hasSelection && !picker.hasNoResult && (
        <ul
          id={LIST_ID}
          role="listbox"
          aria-label="Membres"
          className="flex max-h-[13rem] min-w-0 flex-col overflow-y-auto overscroll-contain rounded-xl border border-white/10 bg-white/5"
        >
          {picker.options.map((option) => (
            <li
              key={option.id}
              role="option"
              aria-selected={option.id === picker.selectedId}
              className="min-w-0 border-b border-white/10 last:border-b-0"
            >
              <button
                type="button"
                onClick={() => picker.onSelect(option.id)}
                disabled={disabled}
                className="flex min-h-11 w-full min-w-0 items-center px-3.5 py-2 text-left text-[15px] text-white active:bg-white/10"
              >
                <span className="min-w-0 break-words">{option.name}</span>
              </button>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
