import { Button } from "@presentation/shared/components/ui/button";
import { CollectionProgressBar } from "../../components/CollectionProgressBar";
import type { DueView } from "../../due-view";

interface OutstandingListProps {
  items: DueView[];
  onManage: () => void;
  // "Relancer" is rendered only when the ViewModel's canRemind is true and
  // the row is eligible (absent, never greyed).
  canRemind: boolean;
  isReminderBusy: boolean;
  onRemind: (id: string, name: string) => void;
}

// "À relancer" (UI-TR-11: the mockup's title restored by amendement (4)).
// Rows stay non-interactive (UI-TR-03) except the per-row "Relancer"; during
// the 7-day window the button is replaced by the notice, on the secondary
// line. The "Enc…" button of the mockup is NOT "Relancer" and stays out
// (UI-TR-10).
export function OutstandingList({
  items,
  onManage,
  canRemind,
  isReminderBusy,
  onRemind,
}: OutstandingListProps) {
  return (
    <section aria-label="À relancer" className="flex flex-col gap-3">
      <div className="flex min-w-0 items-center justify-between gap-3">
        <h2 className="text-[16px] font-extrabold text-white">À relancer</h2>
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
                  {item.reminderCooldownNotice && (
                    <span className="text-[12px] text-white/65">
                      {item.reminderCooldownNotice}
                    </span>
                  )}
                </div>
                <span className="shrink-0 text-[13px] font-extrabold text-coach-red-text">
                  {item.remainingLabel}
                </span>
                {canRemind && item.isReminderEligible && (
                  <Button
                    type="button"
                    variant="outline"
                    onClick={() => onRemind(item.id, item.name)}
                    disabled={isReminderBusy}
                    aria-label={`Relancer ${item.name}`}
                    className="h-11 shrink-0 rounded-full border-amber-300/50 bg-transparent px-4 font-bold text-amber-200 hover:bg-amber-500/15 hover:text-amber-100"
                  >
                    Relancer
                  </Button>
                )}
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
