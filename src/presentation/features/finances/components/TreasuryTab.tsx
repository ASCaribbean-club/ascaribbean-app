import { Button } from "@presentation/shared/components/ui/button";
import type { TreasuryTabView } from "../finances-view";
import { CarrierRow } from "./CarrierRow";

interface TreasuryTabProps {
  view: TreasuryTabView;
  canRecordOpeningBalance: boolean;
  canRecordCheckpoint: boolean;
  onEnterOpeningBalance: (carrierId: string) => void;
  onStartCheckpoint: () => void;
}

// specs/mob-treasurer-finances.md §5 — available (theoretical), season inflows
// and outflows, carriers, checkpoint button, checkpoint history. Aggregates
// only: no nominative cotisation data (AC-FI-24).
export function TreasuryTab({
  view,
  canRecordOpeningBalance,
  canRecordCheckpoint,
  onEnterOpeningBalance,
  onStartCheckpoint,
}: TreasuryTabProps) {
  return (
    <div className="flex min-w-0 flex-col gap-4">
      <section className="flex min-w-0 flex-col gap-2 rounded-3xl border border-white/10 bg-white/5 p-4.5">
        <h2 className="text-[13px] font-bold tracking-wider text-coach-green-text uppercase">
          Disponible (théorique)
        </h2>
        <p
          className={`text-[34px] leading-none font-extrabold ${
            view.isAvailableNegative ? "text-coach-red-text" : ""
          }`}
        >
          {view.availableLabel}
        </p>
        <p className="min-w-0 text-[13.5px] text-white/70">
          Banque {view.bankLabel} · Espèces {view.cashLabel}
        </p>
      </section>

      <div className="grid grid-cols-2 gap-3">
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <p className="truncate text-[12.5px] text-white/60">Entrées saison</p>
          <p className="truncate text-[18px] font-extrabold text-emerald-400">
            {view.incomeLabel}
          </p>
        </div>
        <div className="flex min-w-0 flex-col gap-1 rounded-2xl border border-white/10 bg-white/5 p-3.5">
          <p className="truncate text-[12.5px] text-white/60">Sorties saison</p>
          <p className="truncate text-[18px] font-extrabold text-coach-red-text">
            {view.expensesLabel}
          </p>
        </div>
      </div>

      {view.unattributedLabel && (
        <p className="text-[12.5px] text-white/60">{view.unattributedLabel}</p>
      )}

      <section className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg font-extrabold">Par porteur</h2>
        {view.hasCarriers ? (
          <ul className="flex flex-col">
            {view.carriers.map((carrier) => (
              <CarrierRow
                key={carrier.id}
                carrier={carrier}
                canEnterOpeningBalance={canRecordOpeningBalance}
                onEnterOpeningBalance={onEnterOpeningBalance}
              />
            ))}
          </ul>
        ) : (
          <p role="status" className="text-[14px] text-white/70">
            Aucun porteur n'est configuré.
          </p>
        )}
      </section>

      {canRecordCheckpoint && (
        <Button
          type="button"
          onClick={onStartCheckpoint}
          className="h-12 w-full rounded-full bg-coach-green text-[15px] font-bold text-white hover:bg-coach-green"
        >
          Faire un point de trésorerie
        </Button>
      )}

      <section className="flex min-w-0 flex-col gap-1">
        <h2 className="text-lg font-extrabold">Historique des points</h2>
        {view.checkpoints.length === 0 ? (
          <p role="status" className="text-[14px] text-white/70">
            Aucun point de trésorerie cette saison.
          </p>
        ) : (
          <ul className="flex flex-col">
            {view.checkpoints.map((checkpoint) => (
              <li
                key={checkpoint.id}
                className="flex min-w-0 items-center justify-between gap-3 border-b border-white/10 py-3"
              >
                <p className="min-w-0 truncate text-[14.5px]">{checkpoint.dateLabel}</p>
                <p
                  className={`shrink-0 text-[14px] font-bold whitespace-nowrap ${
                    checkpoint.isJust ? "text-emerald-400" : "text-amber-300"
                  }`}
                >
                  {checkpoint.varianceLabel}
                </p>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
