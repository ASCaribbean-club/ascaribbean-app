import { SectionFilterChips } from "@presentation/shared/components/SectionFilterChips";
import { DuesReminderBanner } from "@presentation/shared/components/DuesReminderBanner";
import { Skeleton } from "@presentation/shared/components/ui/skeleton";
import { ReminderConfirmDialog } from "../components/ReminderConfirmDialog";
import { ReminderFeedback } from "../components/ReminderFeedback";
import { TreasurerStateMessage } from "../components/TreasurerStateMessage";
import { CollectionCard } from "./components/CollectionCard";
import { OutstandingList } from "./components/OutstandingList";
import { SectionBreakdown } from "./components/SectionBreakdown";
import { StatusTiles } from "./components/StatusTiles";
import { TreasurerHeader } from "./components/TreasurerHeader";
import { useTreasurerDashboardViewModel } from "./useTreasurerDashboardViewModel";

// No logic here: only branches on booleans the ViewModel already computed.
// Only control: "Relancer" on the "À relancer" rows (canRemind, amendement
// (4)). No floating "+", no payment control. The member banner of the
// Treasurer's OWN dues reminder sits under the header (UI-TR-13).
export function TreasurerDashboardPage() {
  const vm = useTreasurerDashboardViewModel();

  return (
    <div className="flex flex-col text-white">
      <TreasurerHeader
        firstName={vm.firstName}
        initials={vm.initials}
        contextLabel={vm.contextLabel}
        onAvatarClick={vm.goToProfilePage}
      />

      <div className="flex flex-col gap-4 px-5.5 pb-28">
        <DuesReminderBanner />
        <ReminderFeedback
          feedback={vm.reminderFeedback}
          errorMessage={vm.reminderErrorMessage}
        />

        {vm.isLoading && (
          <div className="flex flex-col gap-3" aria-hidden>
            <Skeleton className="h-36 w-full rounded-2xl bg-white/10" />
            <Skeleton className="h-16 w-full rounded-xl bg-white/10" />
            {[0, 1, 2].map((index) => (
              <Skeleton key={index} className="h-16 w-full bg-white/10" />
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
              {vm.showSectionFilter && (
                <SectionFilterChips
                  sections={vm.sections}
                  selectedSectionId={vm.selectedSectionId}
                  isLoading={false}
                  onSelect={vm.onSelectSection}
                />
              )}
              <CollectionCard
                collected={vm.collected}
                due={vm.due}
                percent={vm.percent}
                remaining={vm.remaining}
              />
              <StatusTiles tiles={vm.tiles} />
              {vm.showSectionBreakdown && (
                <SectionBreakdown rows={vm.sectionRows} />
              )}
              <OutstandingList
                items={vm.outstanding}
                onManage={vm.goToDuesList}
                canRemind={vm.canRemind}
                isReminderBusy={vm.isReminderBusy}
                onRemind={vm.onRemindOne}
              />
            </>
          )}
      </div>

      <ReminderConfirmDialog
        title={vm.confirmTitle}
        isOpen={vm.isConfirmOpen}
        isSending={vm.isReminderBusy}
        onConfirm={vm.onConfirmReminder}
        onCancel={vm.onCancelReminder}
      />
    </div>
  );
}
