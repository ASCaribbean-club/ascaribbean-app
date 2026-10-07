import { IconSearchOff } from "@tabler/icons-react";
import { EmptyState } from "@presentation/shared/components/EmptyState";
import { Skeleton } from "@presentation/shared/components/ui/skeleton";
import { Tabs, TabsList, TabsTrigger } from "@presentation/shared/components/ui/tabs";
import { BackHeader } from "@presentation/shared/layout/BackHeader";
import { TreasurerStateMessage } from "../treasurer/components/TreasurerStateMessage";
import { CheckpointSheet } from "./components/CheckpointSheet";
import { ExpenseSheet } from "./components/ExpenseSheet";
import { ExpensesTab } from "./components/ExpensesTab";
import { OpeningBalanceSheet } from "./components/OpeningBalanceSheet";
import { TreasuryTab } from "./components/TreasuryTab";
import { useFinancesViewModel } from "./useFinancesViewModel";

const TAB_TRIGGER_CLASS =
  "h-11 flex-1 rounded-full text-[14px] font-bold text-white/70 data-[state=active]:bg-white data-[state=active]:text-black";

// specs/mob-treasurer-finances.md — no logic here: only branches on booleans
// and views the ViewModel already computed. The write controls (floating "+",
// "Saisir", "Faire un point", their sheets) are NOT RENDERED without the
// matching can* boolean — absent, never greyed (AC-FI-03).
export function FinancesPage() {
  const vm = useFinancesViewModel();

  if (!vm.canViewFinances) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader onBack={vm.goBack} />
        <EmptyState icon={IconSearchOff} message="Cet écran n’est pas disponible pour votre rôle." />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-white">
      <BackHeader title={vm.title} onBack={vm.goBack} />

      <div className="flex min-w-0 flex-col gap-4 px-5.5 pt-2 pb-28">
        {vm.subtitle && <p className="text-[14px] text-white/60">{vm.subtitle}</p>}

        {vm.hasNoSeason ? (
          <TreasurerStateMessage message="Aucune saison en cours. Les finances s'affichent dès qu'une saison est ouverte." />
        ) : (
          <>
            <Tabs value={vm.tab} onValueChange={vm.selectTab}>
              <TabsList className="h-13 w-full rounded-full border border-white/10 bg-white/5 p-1">
                <TabsTrigger value="expenses" className={TAB_TRIGGER_CLASS}>
                  Dépenses
                </TabsTrigger>
                <TabsTrigger value="treasury" className={TAB_TRIGGER_CLASS}>
                  Trésorerie
                </TabsTrigger>
              </TabsList>
            </Tabs>

            {vm.isLoading && (
              <div className="flex flex-col gap-3" aria-hidden>
                <Skeleton className="h-40 w-full rounded-3xl bg-white/10" />
                {[0, 1, 2, 3].map((index) => (
                  <Skeleton key={index} className="h-14 w-full rounded-xl bg-white/10" />
                ))}
              </div>
            )}

            {vm.hasError && (
              <TreasurerStateMessage
                message="Impossible de charger les finances."
                onRetry={vm.retry}
              />
            )}

            {vm.tab === "expenses" && vm.expensesView && (
              <ExpensesTab
                view={vm.expensesView}
                categoryFilterId={vm.categoryFilterId}
                canRecordExpense={vm.canRecordExpense}
                onSelectCategory={vm.selectCategoryFilter}
                onShowMore={vm.showMore}
                onAdd={vm.openExpenseSheet}
              />
            )}

            {vm.tab === "treasury" && vm.treasuryView && (
              <TreasuryTab
                view={vm.treasuryView}
                canRecordOpeningBalance={vm.canRecordOpeningBalance}
                canRecordCheckpoint={vm.canRecordCheckpoint}
                onEnterOpeningBalance={vm.openOpeningBalanceSheet}
                onStartCheckpoint={vm.openCheckpointSheet}
              />
            )}
          </>
        )}
      </div>

      {vm.snapshot && vm.isExpenseSheetOpen && (
        <ExpenseSheet snapshot={vm.snapshot} today={vm.today} onClose={vm.closeExpenseSheet} />
      )}
      {vm.snapshot && vm.openingBalanceCarrier && (
        <OpeningBalanceSheet
          snapshot={vm.snapshot}
          carrierId={vm.openingBalanceCarrier.id}
          carrierName={vm.openingBalanceCarrier.label}
          onClose={vm.closeOpeningBalanceSheet}
        />
      )}
      {vm.snapshot && vm.isCheckpointSheetOpen && (
        <CheckpointSheet snapshot={vm.snapshot} today={vm.today} onClose={vm.closeCheckpointSheet} />
      )}
    </div>
  );
}
