import { useNavigate } from "react-router-dom";
import {
  effectiveSectionFilter,
  filterEntriesBySection,
  representedSections,
  selectOutstanding,
  shouldShowSectionFilter,
  summarizeBySection,
  summarizeCollection,
} from "@domain/rules/treasurer-dues-rules";
import { formatEuros } from "@presentation/shared/formatters/currency";
import {
  getFirstName,
  getInitials,
} from "@presentation/shared/formatters/greeting";
import { useNow } from "@presentation/shared/hooks/use-now";
import { usePermission } from "@presentation/shared/hooks/use-permission";
import { useActiveRole } from "@presentation/shared/hooks/use-active-role";
import { useAuth } from "@presentation/shared/hooks/use-auth";
import { useSectionFilter } from "@presentation/shared/hooks/use-section-filter";
import { toDueView } from "../due-view";
import { useDuesReminderFlow } from "../use-dues-reminder-flow";
import { useTreasurerDues } from "../use-treasurer-dues";

// Specs/mobile-treasurer.md "Écran A". Every figure comes from the domain
// rules; this hook only picks, formats and exposes booleans. The only write
// control is "Relancer" on the "À relancer" rows ('dues:remind', amendement
// (4)) — UX only, the use case and send_dues_reminders() are the real gate.
const OUTSTANDING_LIMIT = 5; // UI-TR-04

export function useTreasurerDashboardViewModel() {
  const { user } = useAuth();
  const navigate = useNavigate();
  const { isTreasurerView } = useActiveRole();
  const { sectionFilter, selectSection } = useSectionFilter();
  const duesQuery = useTreasurerDues(isTreasurerView);
  const canRemind = usePermission("dues:remind");
  const now = useNow();
  const reminderFlow = useDuesReminderFlow();

  const report = duesQuery.data;
  const entries = report?.entries ?? [];

  // AC-TR-12 — the ONE domain predicate, shared with the list screen.
  const showSectionFilter = shouldShowSectionFilter(entries);
  const selectedSectionId = effectiveSectionFilter(sectionFilter, entries);
  const filtered = filterEntriesBySection(entries, selectedSectionId);

  const summary = summarizeCollection(filtered);
  const outstanding = selectOutstanding(filtered);

  // "Par section" is hidden with 0/1 section (PO-TR-04) and under a chosen
  // section, where it would only repeat the card ("Sans section" is a
  // "Toutes"-only row).
  const showSectionBreakdown = showSectionFilter && selectedSectionId === null;

  return {
    isLoading: duesQuery.isLoading,
    hasError: duesQuery.isError,
    retry: () => void duesQuery.refetch(),
    hasNoSeason: report !== undefined && report.season === null,
    hasNoMembership:
      report !== undefined && report.season !== null && entries.length === 0,

    /// --- Header ---
    firstName: user ? getFirstName(user.fullName) : "",
    initials: user ? getInitials(user.fullName) : "",
    contextLabel: [
      "Club entier",
      report?.season ? `Saison ${report.season.label}` : null,
    ]
      .filter((part): part is string => part !== null)
      .join(" · "),
    goToProfilePage: () => {
      if (!user) return;
      navigate("/profile");
    },

    /// --- Section filter (shared with the list) ---
    showSectionFilter,
    sections: representedSections(entries),
    selectedSectionId,
    // A re-tap on the active chip yields an empty value: ignored.
    onSelectSection: (value: string) => {
      if (!value) return;
      selectSection(value === "all" ? null : value);
    },

    /// --- Collection card + tiles ---
    collected: formatEuros(summary.collectedCents),
    due: formatEuros(summary.dueCents),
    percent: summary.percent,
    remaining: formatEuros(summary.remainingCents),
    tiles: [
      { key: "paid", label: "Soldées", value: summary.paidCount },
      { key: "partial", label: "Partielles", value: summary.partialCount },
      { key: "unpaid", label: "Impayées", value: summary.unpaidCount },
    ],

    /// --- Par section ---
    showSectionBreakdown,
    sectionRows: showSectionBreakdown
      ? summarizeBySection(filtered).map((row) => ({
          key: row.sectionId ?? "none",
          name: row.name,
          amountsLabel: `${formatEuros(row.collectedCents)} / ${formatEuros(row.dueCents)} · ${row.percent}%`,
          percent: row.percent,
        }))
      : [],

    /// --- À relancer (UI-TR-11: label restored) ---
    outstanding: outstanding
      .slice(0, OUTSTANDING_LIMIT)
      .map((entry) => toDueView(entry, showSectionFilter, now)),
    canRemind,
    isReminderBusy: reminderFlow.isSending,
    onRemindOne: (id: string, name: string) =>
      reminderFlow.requestReminder([id], name),
    confirmTitle: reminderFlow.confirmTitle,
    isConfirmOpen: reminderFlow.isConfirmOpen,
    onConfirmReminder: reminderFlow.confirm,
    onCancelReminder: reminderFlow.cancel,
    reminderFeedback: reminderFlow.feedback,
    reminderErrorMessage: reminderFlow.errorMessage,
    hasOutstanding: outstanding.length > 0,
    goToDuesList: () => navigate("/dues"),
  };
}
