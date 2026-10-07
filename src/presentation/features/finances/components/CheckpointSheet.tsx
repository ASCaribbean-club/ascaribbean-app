import type { FinancesSnapshot } from "@domain/entities/finance";
import { Textarea } from "@presentation/shared/components/ui/textarea";
import { useCheckpointSheetViewModel } from "../useCheckpointSheetViewModel";
import { AmountField } from "./AmountField";
import { FinanceSheet } from "./FinanceSheet";

interface CheckpointSheetProps {
  snapshot: FinancesSnapshot;
  today: string;
  onClose: () => void;
}

// specs/mob-treasurer-finances.md §7 (maquette 1) — "Point de trésorerie".
// Treasurer only. The amount field shrinks (`min-w-0 flex-1`) beside the
// variance indicator, which never wraps (`shrink-0 whitespace-nowrap`).
export function CheckpointSheet({ snapshot, today, onClose }: CheckpointSheetProps) {
  const vm = useCheckpointSheetViewModel({ snapshot, today, onRecorded: onClose });

  return (
    <FinanceSheet
      title="Point de trésorerie"
      description="Indique le montant réellement constaté pour chaque porteur. L'écart est calculé par rapport au solde théorique."
      submitLabel="Enregistrer le point"
      submittingLabel="Enregistrement…"
      canSubmit={vm.canSubmit}
      isSubmitting={vm.isSubmitting}
      errorMessage={vm.errorMessage}
      isDirty={vm.isDirty}
      onCancel={onClose}
      onSubmit={vm.submit}
    >
      {vm.rows.map((row) => (
        <div key={row.id} className="flex min-w-0 flex-col gap-1.5">
          <div className="flex min-w-0 items-baseline justify-between gap-3">
            <p className="min-w-0 truncate text-[15px] font-bold">{row.name}</p>
            <p className="shrink-0 text-[13px] whitespace-nowrap text-white/60">
              {row.theoreticalLabel}
            </p>
          </div>
          {row.openingMissing && (
            <p className="text-xs text-amber-300">Solde d'ouverture non saisi</p>
          )}
          <div className="flex min-w-0 items-center gap-3">
            <AmountField
              id={`checkpoint-${row.id}`}
              label={`Montant constaté pour ${row.name}`}
              value={row.text}
              placeholder={row.placeholder}
              onChange={(value) => vm.setCount(row.id, value)}
              disabled={vm.isSubmitting}
            />
            <p
              className={`shrink-0 text-[14px] font-bold whitespace-nowrap ${
                row.isJust ? "text-emerald-400" : "text-amber-300"
              }`}
            >
              {row.varianceLabel}
            </p>
          </div>
        </div>
      ))}

      <div className="flex min-w-0 items-center justify-between gap-3 border-y border-white/10 py-3">
        <p className="min-w-0 truncate text-[15px] font-bold text-white/80">
          Total constaté
        </p>
        <p className="shrink-0 text-xl font-extrabold whitespace-nowrap">
          {vm.totalCountedLabel}
        </p>
      </div>

      <div className="flex min-w-0 flex-col gap-1.5">
        <label
          htmlFor="checkpoint-debrief"
          className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase"
        >
          Débrief
        </label>
        <Textarea
          id="checkpoint-debrief"
          rows={3}
          value={vm.debrief}
          disabled={vm.isSubmitting}
          onChange={(event) => vm.setDebrief(event.target.value)}
          aria-invalid={vm.isDebriefTooLong ? true : undefined}
          className="min-h-[4.5rem] rounded-xl border-white/15 bg-white/5 text-white"
        />
        <p className={`text-xs ${vm.isDebriefTooLong ? "text-red-300" : "text-white/50"}`}>
          {vm.debrief.length} / {vm.maxDebriefLength} caractères maximum
        </p>
      </div>
    </FinanceSheet>
  );
}
