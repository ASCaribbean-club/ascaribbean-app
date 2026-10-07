import { IconPencil } from "@tabler/icons-react";
import { Button } from "@presentation/shared/components/ui/button";
import { Input } from "@presentation/shared/components/ui/input";
import { categoryColor } from "../category-palette";
import type { ExpenseSheetViewModel } from "../useExpenseSheetViewModel";
import { CategoryEditRow } from "./CategoryEditRow";
import { ChoiceChips } from "./ChoiceChips";

// specs/finances-member-advances.md A2 step 2 — the category chips, the dashed
// "+ Nouvelle" chip and its creation row, and (correction only) the pencil on
// the selected chip with the rename / delete row: unchanged behavior, moved
// into the second step of the wizard.
export function ExpenseCategoryStep({ vm }: { vm: ExpenseSheetViewModel }) {
  return (
    <div className="flex min-w-0 flex-col gap-3">
      {vm.categoryEdit.isOpen ? (
        <CategoryEditRow edit={vm.categoryEdit} />
      ) : (
        <ChoiceChips
          legend="Catégorie"
          disabled={vm.isSubmitting}
          selectedId={vm.categoryId}
          onSelect={vm.selectCategory}
          options={vm.categoryOptions.map((option) => ({
            id: option.id,
            label: option.label,
            leading: (
              <span
                aria-hidden
                className={`size-2.5 shrink-0 rounded-full ${categoryColor(option.colorIndex).dot}`}
              />
            ),
            // Pencil on the SELECTED chip only, and only with canRenameCategory
            // (O-FIE-UI-01): tapping a chip still just selects it.
            after:
              option.id === vm.categoryEdit.pencilCategoryId ? (
                <Button
                  type="button"
                  variant="ghost"
                  onClick={vm.categoryEdit.open}
                  disabled={vm.isSubmitting}
                  aria-label={vm.categoryEdit.pencilLabel}
                  className="size-11 shrink-0 rounded-full text-white/70 hover:bg-white/10"
                >
                  <IconPencil aria-hidden className="size-4" />
                </Button>
              ) : undefined,
          }))}
          trailing={
            !vm.isNewCategoryOpen && (
              <Button
                type="button"
                variant="outline"
                onClick={vm.openNewCategory}
                disabled={vm.isSubmitting}
                className="h-11 rounded-full border-dashed border-white/25 bg-transparent px-4 text-[14px] font-semibold text-white/80 hover:bg-white/10"
              >
                + Nouvelle
              </Button>
            )
          }
        />
      )}

      {vm.isNewCategoryOpen && !vm.categoryEdit.isOpen && (
        <div className="flex min-w-0 flex-col gap-2">
          {/* Field and buttons wrap below each other on a narrow phone. */}
          <div className="flex min-w-0 flex-wrap items-center gap-2">
            <Input
              aria-label="Nom de la catégorie"
              placeholder="Nom de la catégorie"
              value={vm.newCategoryLabel}
              maxLength={vm.maxCategoryLength}
              disabled={vm.isCreatingCategory}
              onChange={(event) => vm.setNewCategoryLabel(event.target.value)}
              className="h-11 min-w-0 flex-1 basis-40 rounded-xl border-white/15 bg-white/5 text-white"
            />
            <Button
              type="button"
              onClick={vm.submitNewCategory}
              disabled={vm.isCreatingCategory}
              className="h-11 shrink-0 rounded-full bg-white px-4 font-bold text-black hover:bg-white/90"
            >
              Ajouter
            </Button>
            <Button
              type="button"
              variant="ghost"
              onClick={vm.cancelNewCategory}
              disabled={vm.isCreatingCategory}
              className="h-11 shrink-0 rounded-full px-4 font-semibold text-white/70 hover:bg-white/10"
            >
              Annuler
            </Button>
          </div>
          {vm.newCategoryError && (
            <p role="alert" className="text-xs text-red-300">
              {vm.newCategoryError}
            </p>
          )}
        </div>
      )}
    </div>
  );
}
