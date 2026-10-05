import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import { isReminderEligible, summarizeReminders } from "@domain/rules/dues-reminder-rules";
import {
  countByStatus,
  effectiveSectionFilter,
  filterByStatus,
  filterEntriesBySection,
  representedSections,
  searchByName,
  shouldShowSectionFilter,
  sortForList,
  summarizeCollection,
  type DuesStatusFilter,
} from "@domain/rules/treasurer-dues-rules";
import { formatEuroAmount, formatEuros } from "@presentation/shared/formatters/currency";
import { usePermission } from "@presentation/shared/hooks/use-permission";
import { useNow } from "@presentation/shared/hooks/use-now";
import { useSectionFilter } from "@presentation/shared/hooks/use-section-filter";
import { toDueView } from "../due-view";
import { useDuesReminderFlow } from "../use-dues-reminder-flow";
import { useTreasurerDues } from "../use-treasurer-dues";

const STATUS_FILTERS: { value: DuesStatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "unpaid", label: "Impayées" },
  { value: "partial", label: "Partielles" },
  { value: "paid", label: "Soldées" },
];

// specs/mobile-treasurer.md "Écran B". 'dues:read' is UX only (menu card / URL
// guard): get_treasurer_dues() is the real boundary. Treasurer and
// authorized-officer see the same list. Only 'payment:record' (admin,
// treasurer — PO-TR-01(a), amendement UI du 2026-10-05 (3)) shows
// "+ Ajouter un paiement"; only 'dues:remind' (treasurer, amendement (4))
// shows "Relancer", "Tout relancer" and "Sélection" — all UX only, the use
// case and send_dues_reminders() are the real gates.
export function useDuesListViewModel() {
  const navigate = useNavigate();
  const canViewDues = usePermission("dues:read");
  // UX only — RecordPaymentUseCase + RLS are the real gate.
  const canRecordPayment = usePermission("payment:record");
  // UX only — SendDuesRemindersUseCase + send_dues_reminders() are the real gate.
  const canRemind = usePermission("dues:remind");
  const now = useNow();
  const { sectionFilter, selectSection } = useSectionFilter();
  const duesQuery = useTreasurerDues(canViewDues);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<DuesStatusFilter>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const [isSelectionMode, setIsSelectionMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<ReadonlySet<string>>(new Set());
  const exitSelection = () => {
    setIsSelectionMode(false);
    setSelectedIds(new Set());
  };
  const reminderFlow = useDuesReminderFlow({ onSent: exitSelection });

  const [paymentTargetId, setPaymentTargetId] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);

  // The confirmation is brief (3 s) and non-blocking.
  useEffect(() => {
    if (successMessage === null) return;
    const timer = setTimeout(() => setSuccessMessage(null), 3000);
    return () => clearTimeout(timer);
  }, [successMessage]);

  const report = duesQuery.data;
  const entries = report?.entries ?? [];

  // AC-TR-12 — same domain predicate as the dashboard.
  const showSectionFilter = shouldShowSectionFilter(entries);
  const selectedSectionId = effectiveSectionFilter(sectionFilter, entries);
  const sections = representedSections(entries);
  const inSection = filterEntriesBySection(entries, selectedSectionId);

  // Status counts follow the section filter, not the search (UI design).
  const counts = countByStatus(inSection);
  // Banner counts follow the active filters (status, section), NOT the
  // search (amendement (4), §G).
  const inStatus = filterByStatus(inSection, statusFilter);
  const visible = sortForList(searchByName(inStatus, searchText));

  const summary = summarizeCollection(inSection);
  const reminders = summarizeReminders(inStatus, now);
  const eligibleForAll = inStatus.filter(
    (entry) => entry.remainingCents > 0 && isReminderEligible(entry, now),
  );

  // Selection mode lists only memberships with a remaining amount; filters
  // and search stay active. Selection only ever holds eligible, visible ids,
  // so the counter is exact even after a filter change.
  const listed = isSelectionMode
    ? visible.filter((entry) => entry.remainingCents > 0)
    : visible;
  const selectableIds = listed
    .filter((entry) => isReminderEligible(entry, now))
    .map((entry) => entry.membershipId);
  const effectiveSelectedIds = selectableIds.filter((id) => selectedIds.has(id));
  const areAllSelected =
    selectableIds.length > 0 &&
    effectiveSelectedIds.length === selectableIds.length;
  const hasUnsettled = entries.some((entry) => entry.remainingCents > 0);
  const statusSummary =
    statusFilter === "all"
      ? "Tous statuts"
      : (STATUS_FILTERS.find((f) => f.value === statusFilter)?.label ?? "");
  const sectionSummary = showSectionFilter
    ? (sections.find((section) => section.id === selectedSectionId)?.name ??
      "Toutes sections")
    : null;

  const reset = () => {
    setStatusFilter("all");
    if (showSectionFilter) selectSection(null);
  };

  return {
    canViewDues,
    isLoading: duesQuery.isLoading,
    hasError: duesQuery.isError,
    retry: () => void duesQuery.refetch(),
    hasNoSeason: report !== undefined && report.season === null,
    hasNoMembership:
      report !== undefined && report.season !== null && entries.length === 0,
    hasNoResult:
      report !== undefined && entries.length > 0 && listed.length === 0,
    goBack: () => navigate(-1),

    title: "Cotisations",
    subtitle: report?.season
      ? `Saison ${report.season.label} · ${formatEuros(summary.collectedCents)} / ${formatEuros(summary.dueCents)} encaissés`
      : undefined,

    searchText,
    onSearchChange: setSearchText,

    /// --- Filters panel ---
    isFiltersOpen,
    toggleFilters: () => setIsFiltersOpen((open) => !open),
    filtersSummary: [statusSummary, sectionSummary]
      .filter((part): part is string => part !== null)
      .join(" · "),
    statusFilter,
    statusOptions: STATUS_FILTERS.map((option) => ({
      value: option.value,
      label: `${option.label} · ${counts[option.value]}`,
    })),
    // A re-tap on the active chip yields an empty value: ignored.
    onSelectStatus: (value: string) => {
      if (!value) return;
      setStatusFilter(value as DuesStatusFilter);
    },
    showSectionFilter,
    sections,
    selectedSectionId,
    onSelectSection: (value: string) => {
      if (!value) return;
      selectSection(value === "all" ? null : value);
    },
    reset,

    /// --- Summary banner (amendement (4): "{n} à relancer — … · {m} sans relance depuis 7 j") ---
    hasOutstanding: reminders.outstandingCount > 0,
    outstandingLabel: `${reminders.outstandingCount} licencié${reminders.outstandingCount > 1 ? "s" : ""} à relancer — ${formatEuros(reminders.remainingCents)} restant · ${reminders.eligibleCount} sans relance depuis 7 j`,

    /// --- Reminders ---
    canRemind,
    isReminderBusy: reminderFlow.isSending,
    // "Tout relancer": absent without canRemind, in selection mode, or at m = 0.
    canRemindAll: canRemind && !isSelectionMode && reminders.eligibleCount > 0,
    onRemindAll: () =>
      reminderFlow.requestReminder(
        eligibleForAll.map((entry) => entry.membershipId),
      ),
    onRemindOne: (id: string, name: string) =>
      reminderFlow.requestReminder([id], name),
    confirmTitle: reminderFlow.confirmTitle,
    isConfirmOpen: reminderFlow.isConfirmOpen,
    onConfirmReminder: reminderFlow.confirm,
    onCancelReminder: reminderFlow.cancel,
    reminderFeedback: reminderFlow.feedback,
    reminderErrorMessage: reminderFlow.errorMessage,

    /// --- Selection mode (exports 5 and 6) ---
    // "Sélection" stays visible while at least one unsettled card exists.
    canEnterSelection: canRemind && (hasUnsettled || isSelectionMode),
    isSelectionMode,
    toggleSelectionMode: () =>
      isSelectionMode ? exitSelection() : setIsSelectionMode(true),
    selectionHint:
      "Touchez les licenciés à relancer. Seuls ceux avec un reste dû sont affichés.",
    isSelected: (id: string) => effectiveSelectedIds.includes(id),
    toggleSelected: (id: string) => {
      if (!selectableIds.includes(id)) return;
      setSelectedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      });
    },
    selectedCount: effectiveSelectedIds.length,
    selectedCountLabel: `${effectiveSelectedIds.length} sélectionné${effectiveSelectedIds.length > 1 ? "s" : ""}`,
    areAllSelected,
    // "Tout" ticks every eligible visible card; "Aucun" when all are ticked.
    toggleAllSelected: () =>
      setSelectedIds(areAllSelected ? new Set() : new Set(selectableIds)),
    canSendSelection: effectiveSelectedIds.length > 0 && !reminderFlow.isSending,
    onSendSelection: () =>
      reminderFlow.requestReminder(
        effectiveSelectedIds,
        entries.find((entry) => entry.membershipId === effectiveSelectedIds[0])
          ?.memberName,
      ),

    /// --- Cards ---
    dues: listed.map((entry) => toDueView(entry, showSectionFilter, now)),

    /// --- Record a payment (amendement UI du 2026-10-05 (3)) ---
    canRecordPayment,
    seasonLabel: report?.season?.label ?? "",
    // Resolved from the full list, not the filtered one: the form stays open
    // even if a refresh would drop the card from an active filter.
    paymentTarget:
      canRecordPayment && paymentTargetId !== null
        ? (entries
            .filter((entry) => entry.membershipId === paymentTargetId)
            .map((entry) => toDueView(entry, showSectionFilter))[0] ?? null)
        : null,
    openPayment: (id: string) => setPaymentTargetId(id),
    closePayment: () => setPaymentTargetId(null),
    onPaymentRecorded: (amountCents: number) => {
      setPaymentTargetId(null);
      setSuccessMessage(`Paiement de ${formatEuroAmount(amountCents / 100)} enregistré`);
    },
    successMessage,
    expandedIds,
    toggleExpanded: (id: string) =>
      setExpandedIds((current) => {
        const next = new Set(current);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        return next;
      }),
  };
}
