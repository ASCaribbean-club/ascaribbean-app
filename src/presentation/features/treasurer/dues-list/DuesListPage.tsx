import { IconSearch, IconSearchOff } from "@tabler/icons-react";
import { EmptyState } from "@presentation/shared/components/EmptyState";
import { Alert, AlertDescription } from "@presentation/shared/components/ui/alert";
import { Button } from "@presentation/shared/components/ui/button";
import { Input } from "@presentation/shared/components/ui/input";
import { Skeleton } from "@presentation/shared/components/ui/skeleton";
import { BackHeader } from "@presentation/shared/layout/BackHeader";
import { TreasurerStateMessage } from "../components/TreasurerStateMessage";
import { ReminderConfirmDialog } from "../components/ReminderConfirmDialog";
import { ReminderFeedback } from "../components/ReminderFeedback";
import { DueCard } from "./components/DueCard";
import { OutstandingBanner } from "./components/OutstandingBanner";
import { SelectableDueCard } from "./components/SelectableDueCard";
import { SelectionBar } from "./components/SelectionBar";
import { RecordDuePaymentDialog } from "./components/RecordDuePaymentDialog";
import { DuesFilters } from "./components/DuesFilters";
import { useDuesListViewModel } from "./useDuesListViewModel";

// No logic here: only branches on booleans the ViewModel already computed.
// "+ Ajouter un paiement" (expanded card, canRecordPayment) and the reminder
// controls "Relancer", "Tout relancer", "Sélection" (canRemind, amendement
// (4)) are the only write controls: no floating "+" button.
export function DuesListPage() {
  const vm = useDuesListViewModel();

  if (!vm.canViewDues) {
    return (
      <div className="flex min-h-full flex-col bg-coach-bg font-coach text-white">
        <BackHeader onBack={vm.goBack} />
        <EmptyState
          icon={IconSearchOff}
          message="Cet écran n’est pas disponible pour votre rôle."
        />
      </div>
    );
  }

  return (
    <div className="flex min-h-full flex-col text-white">
      <BackHeader
        title={vm.title}
        subtitle={vm.subtitle}
        onBack={vm.goBack}
        action={
          vm.canEnterSelection && (
            <Button
              type="button"
              variant="outline"
              onClick={vm.toggleSelectionMode}
              disabled={vm.isReminderBusy}
              className="h-11 rounded-full border-white/20 bg-transparent px-4 font-bold text-white"
            >
              {vm.isSelectionMode ? "Annuler" : "Sélection"}
            </Button>
          )
        }
      />

      <div className="flex flex-col gap-4 px-5.5 pt-4 pb-28">
        {vm.successMessage && (
          <Alert role="status" className="border-white/10 bg-white/10 text-white">
            <AlertDescription className="text-white">
              {vm.successMessage}
            </AlertDescription>
          </Alert>
        )}

        <ReminderFeedback
          feedback={vm.reminderFeedback}
          errorMessage={vm.reminderErrorMessage}
        />

        {vm.isLoading && (
          <div className="flex flex-col gap-3" aria-hidden>
            {[0, 1, 2, 3].map((index) => (
              <Skeleton
                key={index}
                className="h-24 w-full rounded-2xl bg-white/10"
              />
            ))}
          </div>
        )}

        {vm.hasError && (
          <TreasurerStateMessage
            message="Impossible de charger les cotisations."
            onRetry={vm.retry}
          />
        )}
        {vm.hasNoSeason && (
          <TreasurerStateMessage message="Aucune saison n'est en cours : les cotisations ne sont pas disponibles." />
        )}
        {vm.hasNoMembership && (
          <TreasurerStateMessage message="Aucune adhésion pour la saison en cours." />
        )}

        {!vm.isLoading &&
          !vm.hasError &&
          !vm.hasNoSeason &&
          !vm.hasNoMembership && (
            <>
              <div className="relative">
                <IconSearch
                  aria-hidden
                  className="pointer-events-none absolute top-1/2 left-3.5 size-4.5 -translate-y-1/2 text-white/50"
                />
                <Input
                  type="search"
                  value={vm.searchText}
                  onChange={(event) => vm.onSearchChange(event.target.value)}
                  placeholder="Rechercher un licencié"
                  aria-label="Rechercher un licencié"
                  className="h-11 min-w-0 rounded-xl border-white/10 bg-white/5 pl-10 text-white"
                />
              </div>

              <DuesFilters
                isExpanded={vm.isFiltersOpen}
                onToggle={vm.toggleFilters}
                summary={vm.filtersSummary}
                statusFilter={vm.statusFilter}
                statusOptions={vm.statusOptions}
                onSelectStatus={vm.onSelectStatus}
                showSectionFilter={vm.showSectionFilter}
                sections={vm.sections}
                selectedSectionId={vm.selectedSectionId}
                onSelectSection={vm.onSelectSection}
                onReset={vm.reset}
              />

              {vm.isSelectionMode ? (
                <p className="text-[13px] text-white/70">{vm.selectionHint}</p>
              ) : (
                vm.hasOutstanding && (
                  <OutstandingBanner
                    label={vm.outstandingLabel}
                    canRemindAll={vm.canRemindAll}
                    isBusy={vm.isReminderBusy}
                    onRemindAll={vm.onRemindAll}
                  />
                )
              )}

              {vm.hasNoResult ? (
                <div className="flex flex-col items-start gap-3 rounded-2xl border border-white/10 bg-white/5 p-5">
                  <p className="text-[14px] text-white/80">
                    Aucun licencié ne correspond
                  </p>
                  <Button
                    type="button"
                    variant="outline"
                    onClick={vm.reset}
                    className="h-11 border-white/20 text-white"
                  >
                    Réinitialiser
                  </Button>
                </div>
              ) : (
                <ul className="flex flex-col gap-2.5">
                  {vm.dues.map((due) =>
                    vm.isSelectionMode ? (
                      <SelectableDueCard
                        key={due.id}
                        due={due}
                        isSelectable={due.isReminderEligible}
                        isSelected={vm.isSelected(due.id)}
                        onToggle={() => vm.toggleSelected(due.id)}
                      />
                    ) : (
                      <DueCard
                        key={due.id}
                        due={due}
                        isExpanded={vm.expandedIds.has(due.id)}
                        onToggle={() => vm.toggleExpanded(due.id)}
                        canRecordPayment={vm.canRecordPayment}
                        onAddPayment={() => vm.openPayment(due.id)}
                        canRemind={vm.canRemind}
                        isReminderBusy={vm.isReminderBusy}
                        onRemind={() => vm.onRemindOne(due.id, due.name)}
                      />
                    ),
                  )}
                </ul>
              )}
            </>
          )}
      </div>

      {vm.isSelectionMode && (
        <SelectionBar
          countLabel={vm.selectedCountLabel}
          areAllSelected={vm.areAllSelected}
          canSend={vm.canSendSelection}
          isBusy={vm.isReminderBusy}
          onToggleAll={vm.toggleAllSelected}
          onSend={vm.onSendSelection}
        />
      )}

      <ReminderConfirmDialog
        title={vm.confirmTitle}
        isOpen={vm.isConfirmOpen}
        isSending={vm.isReminderBusy}
        onConfirm={vm.onConfirmReminder}
        onCancel={vm.onCancelReminder}
      />

      <RecordDuePaymentDialog
        due={vm.paymentTarget}
        seasonLabel={vm.seasonLabel}
        onClose={vm.closePayment}
        onRecorded={vm.onPaymentRecorded}
      />
    </div>
  );
}
