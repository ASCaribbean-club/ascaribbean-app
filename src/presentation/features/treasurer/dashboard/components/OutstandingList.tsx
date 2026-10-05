import { Button } from "@presentation/shared/components/ui/button";
import { CollectionProgressBar } from "../../components/CollectionProgressBar";
import type { DueView } from "../../due-view";

interface OutstandingListProps {
  items: DueView[];
  onManage: () => void;
}

// "Restes dus": read-only, non-interactive rows (UI-TR-03) — no reminder or
// payment button. Only the link to the full list is actionable.
export function OutstandingList({ items, onManage }: OutstandingListProps) {
  return (
    <section aria-label="Restes dus" className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="text-[16px] font-extrabold text-white">Restes dus</h2>
        <Button
          type="button"
          variant="ghost"
          onClick={onManage}
          className="h-11 shrink-0 px-3 text-[13px] font-bold text-coach-green-text hover:bg-white/10"
        >
          Gérer les cotisations
        </Button>
      </div>

      {items.length === 0 ? (
        <p className="rounded-2xl border border-white/10 bg-white/5 p-4 text-[13.5px] text-white/70">
          Aucun reste dû.
        </p>
      ) : (
        <ul className="flex flex-col gap-2.5">
          {items.map((item) => (
            <li
              key={item.id}
              className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/5 p-3.5"
            >
              <div className="flex min-w-0 items-center gap-3">
                <span
                  aria-hidden
                  className="flex size-9.5 shrink-0 items-center justify-center rounded-full bg-white/10 text-[13px] font-bold text-white"
                >
                  {item.initials}
                </span>
                <div className="flex min-w-0 flex-1 flex-col">
                  <span className="truncate text-[14.5px] font-bold text-white">
                    {item.name}
                  </span>
                  <span className="truncate text-[12px] text-white/65">
                    {item.sectionLabel ? `${item.sectionLabel} · ` : ""}
                    {item.amountsLabel}
                  </span>
                </div>
                <span className="shrink-0 text-[13px] font-extrabold text-coach-red-text">
                  {item.remainingLabel}
                </span>
              </div>
              <CollectionProgressBar
                percent={item.percent}
                label={`${item.name} : ${item.percent}% payé`}
              />
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
