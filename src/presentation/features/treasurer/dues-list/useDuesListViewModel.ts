import { useState } from "react";
import { useNavigate } from "react-router-dom";
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
  summarizeOutstanding,
  type DuesStatusFilter,
} from "@domain/rules/treasurer-dues-rules";
import { formatEuros } from "@presentation/shared/formatters/currency";
import { usePermission } from "@presentation/shared/hooks/use-permission";
import { useSectionFilter } from "@presentation/shared/hooks/use-section-filter";
import { toDueView } from "../due-view";
import { useTreasurerDues } from "../use-treasurer-dues";

const STATUS_FILTERS: { value: DuesStatusFilter; label: string }[] = [
  { value: "all", label: "Tous" },
  { value: "unpaid", label: "Impayées" },
  { value: "partial", label: "Partielles" },
  { value: "paid", label: "Soldées" },
];

// specs/mobile-treasurer.md "Écran B" — read-only list. 'dues:read' is UX
// only (menu card / URL guard): get_treasurer_dues() is the real boundary.
// Treasurer and authorized-officer see the same read-only screen; no write or
// reminder control exists for either (PO-TR-01, AC-TR-16).
export function useDuesListViewModel() {
  const navigate = useNavigate();
  const canViewDues = usePermission("dues:read");
  const { sectionFilter, selectSection } = useSectionFilter();
  const duesQuery = useTreasurerDues(canViewDues);

  const [searchText, setSearchText] = useState("");
  const [statusFilter, setStatusFilter] = useState<DuesStatusFilter>("all");
  const [isFiltersOpen, setIsFiltersOpen] = useState(false);
  const [expandedIds, setExpandedIds] = useState<ReadonlySet<string>>(
    new Set(),
  );

  const report = duesQuery.data;
  const entries = report?.entries ?? [];

  // AC-TR-12 — same domain predicate as the dashboard.
  const showSectionFilter = shouldShowSectionFilter(entries);
  const selectedSectionId = effectiveSectionFilter(sectionFilter, entries);
  const sections = representedSections(entries);
  const inSection = filterEntriesBySection(entries, selectedSectionId);

  // Status counts follow the section filter, not the search (UI design).
  const counts = countByStatus(inSection);
  const visible = sortForList(
    searchByName(filterByStatus(inSection, statusFilter), searchText),
  );

  const summary = summarizeCollection(inSection);
  const outstanding = summarizeOutstanding(visible);

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
      report !== undefined && entries.length > 0 && visible.length === 0,
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

    /// --- Summary banner (read-only wording, no reminder) ---
    hasOutstanding: outstanding.count > 0,
    outstandingLabel: `${outstanding.count} licencié${outstanding.count > 1 ? "s" : ""} avec un reste dû — ${formatEuros(outstanding.remainingCents)} restant`,

    /// --- Cards ---
    dues: visible.map((entry) => toDueView(entry, showSectionFilter)),
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
