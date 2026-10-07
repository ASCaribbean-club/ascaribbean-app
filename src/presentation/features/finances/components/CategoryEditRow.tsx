import { Button } from "@presentation/shared/components/ui/button";
import { Input } from "@presentation/shared/components/ui/input";
import type { useCategoryEditViewModel } from "../useCategoryEditViewModel";

type CategoryEdit = ReturnType<typeof useCategoryEditViewModel>;

// specs/mob-treasurer-finances-edit.md §4 — replaces the chip row IN PLACE
// (like the "+ Nouvelle" row): name field, "Enregistrer" / "Annuler", and —
// only for an unused category with the right to delete — "Supprimer la
// catégorie" with its own in-place confirmation. Field and buttons wrap on a
// narrow phone (`flex-wrap`, field `min-w-0 flex-1 basis-40`).
export function CategoryEditRow({ edit }: { edit: CategoryEdit }) {
  return (
    <div className="flex min-w-0 flex-col gap-2">
      <div className="flex min-w-0 flex-wrap items-center gap-2">
        <Input
          aria-label="Nom de la catégorie"
          value={edit.label}
          maxLength={edit.maxLength}
          disabled={edit.isBusy}
          onChange={(event) => edit.setLabel(event.target.value)}
          className="h-11 min-w-0 flex-1 basis-40 rounded-xl border-white/15 bg-white/5 text-white"
        />
        <Button
          type="button"
          onClick={edit.submit}
          disabled={edit.isBusy || edit.isConfirmingDelete}
          className="h-11 shrink-0 rounded-full bg-white px-4 font-bold text-black hover:bg-white/90"
        >
          {edit.isRenaming ? "Enregistrement…" : "Enregistrer"}
        </Button>
        <Button
          type="button"
          variant="ghost"
          onClick={edit.cancel}
          disabled={edit.isBusy}
          className="h-11 shrink-0 rounded-full px-4 font-semibold text-white/70 hover:bg-white/10"
        >
          Annuler
        </Button>
      </div>
      {edit.error && (
        <p role="alert" className="text-xs text-red-300">
          {edit.error}
        </p>
      )}

      {edit.canDelete && !edit.isConfirmingDelete && (
        <Button
          type="button"
          variant="outline"
          onClick={edit.requestDelete}
          disabled={edit.isBusy}
          className="h-11 w-full rounded-full border-coach-red-text/60 bg-transparent font-semibold text-coach-red-text hover:bg-coach-red/10"
        >
          Supprimer la catégorie
        </Button>
      )}
      {edit.canDelete && edit.isConfirmingDelete && (
        <div className="flex min-w-0 flex-col gap-2">
          <p className="text-[14px] text-white/80">{edit.deleteConfirmMessage}</p>
          <Button
            type="button"
            onClick={edit.confirmDelete}
            disabled={edit.isDeleting}
            className="h-11 w-full rounded-full bg-coach-red font-bold text-white hover:bg-coach-red disabled:opacity-50"
          >
            {edit.isDeleting ? "Suppression…" : "Supprimer définitivement"}
          </Button>
          <Button
            type="button"
            variant="outline"
            onClick={edit.cancelDelete}
            disabled={edit.isDeleting}
            className="h-11 w-full rounded-full border-white/20 bg-white/5 font-semibold text-white hover:bg-white/10"
          >
            Annuler
          </Button>
        </div>
      )}
    </div>
  );
}
