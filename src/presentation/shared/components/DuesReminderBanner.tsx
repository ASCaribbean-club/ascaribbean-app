import { IconReceipt, IconX } from "@tabler/icons-react";
import {
  Alert,
  AlertDescription,
} from "@presentation/shared/components/ui/alert";
import { Button } from "@presentation/shared/components/ui/button";
import { useDuesReminderViewModel } from "@presentation/shared/hooks/useDuesReminderViewModel";

// specs/mobile-treasurer.md amendement UI du 2026-10-05 (4), (b) — "Rappel de
// cotisation". No mockup exists (PO-TR-11 settled: dismissible banner at the
// top of the Dashboard views); geometry borrowed from MissingDocumentAlert
// but amber, not the red reserved for the blocking missing-document alert.
// Mounted under the header of each of the four dashboard views (UI-TR-13),
// one component, one ViewModel. Absence — never a grey/empty state — when
// there is nothing to show. Tapping the card opens the profile, where the member's
// cotisation and payment link live; the close (X) button, labelled "Masquer" for assistive tech, dismisses it. role="status", every piece of information is
// in the text, not in the tint. Never shows the sender, the reminder count,
// the payments, the total due or a payment link (AC-TR-39).
export function DuesReminderBanner() {
  const vm = useDuesReminderViewModel();

  return (
    <>
      {vm.showDuesAlert && (
        <section
          role="status"
          aria-label="Rappel de cotisation"
          className="relative flex flex-col gap-1 rounded-2xl border border-amber-300/30 bg-amber-500/10 px-3.5 py-3"
        >
          <button
            type="button"
            onClick={vm.onOpenProfile}
            aria-label="Voir ma cotisation dans mon profil"
            className="flex w-full min-w-0 flex-col gap-1 text-left"
          >
            <div className="flex min-w-0 items-center gap-2 pr-9">
              <span
                aria-hidden
                className="flex size-7 shrink-0 items-center justify-center rounded-full bg-amber-500/20"
              >
                <IconReceipt className="size-4 text-amber-200" />
              </span>
              <span className="min-w-0 truncate text-[10.5px] font-extrabold tracking-wider text-amber-200 uppercase">
                Rappel de cotisation
              </span>
              <span aria-hidden className="shrink-0 text-white/40">
                ·
              </span>
              <span className="shrink-0 text-[12px] text-white/60">
                {vm.remindedDateLabel}
              </span>
            </div>
            <span className="text-[15px] font-bold text-white">
              {vm.seasonLine}
            </span>
            <span className="text-[13px] text-white/80">{vm.guidanceLine}</span>
          </button>
          {/* 44px hit area (CLAUDE.md §6), icon kept small; overlaps the card's top-right padding. */}
          <Button
            type="button"
            variant="ghost"
            onClick={vm.onHide}
            disabled={vm.isHiding}
            aria-label="Masquer le rappel de cotisation"
            className="absolute top-0 right-0 size-11 rounded-full p-0 text-amber-100 hover:bg-amber-500/15 hover:text-amber-50"
          >
            <IconX className="size-4.5" aria-hidden />
          </Button>
        </section>
      )}
      {vm.hideErrorMessage && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{vm.hideErrorMessage}</AlertDescription>
        </Alert>
      )}
    </>
  );
}
