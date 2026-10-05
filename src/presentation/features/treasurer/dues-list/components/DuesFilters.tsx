import type { Section } from "@domain/entities/section";
import { CollapsibleFilterPanel } from "@presentation/shared/components/CollapsibleFilterPanel";
import {
  FILTER_CHIP_CLASSNAME,
  FILTER_LABEL_CLASSNAME,
} from "@presentation/shared/components/filter-chip-styles";
import { SectionFilterChips } from "@presentation/shared/components/SectionFilterChips";
import { Button } from "@presentation/shared/components/ui/button";
import {
  ToggleGroup,
  ToggleGroupItem,
} from "@presentation/shared/components/ui/toggle-group";

interface DuesFiltersProps {
  isExpanded: boolean;
  onToggle: () => void;
  summary: string;
  statusFilter: string;
  statusOptions: { value: string; label: string }[];
  onSelectStatus: (value: string) => void;
  // Rendered only when the domain predicate says so (AC-TR-10/11).
  showSectionFilter: boolean;
  sections: Pick<Section, "id" | "name">[];
  selectedSectionId: string | null;
  onSelectSection: (value: string) => void;
  onReset: () => void;
}

export function DuesFilters({
  isExpanded,
  onToggle,
  summary,
  statusFilter,
  statusOptions,
  onSelectStatus,
  showSectionFilter,
  sections,
  selectedSectionId,
  onSelectSection,
  onReset,
}: DuesFiltersProps) {
  return (
    <CollapsibleFilterPanel
      isExpanded={isExpanded}
      onToggle={onToggle}
      summary={summary}
    >
      <div className="flex flex-col gap-2">
        <h2 className={FILTER_LABEL_CLASSNAME}>Statut</h2>
        <ToggleGroup
          type="single"
          aria-label="Filtrer par statut"
          value={statusFilter}
          onValueChange={onSelectStatus}
          spacing={1.5}
          className="w-full flex-wrap"
        >
          {statusOptions.map((option) => (
            <ToggleGroupItem
              key={option.value}
              value={option.value}
              className={FILTER_CHIP_CLASSNAME}
            >
              {option.label}
            </ToggleGroupItem>
          ))}
        </ToggleGroup>
      </div>

      {showSectionFilter && (
        <SectionFilterChips
          sections={sections}
          selectedSectionId={selectedSectionId}
          isLoading={false}
          onSelect={onSelectSection}
          bleedClassName="-mx-3.5 px-3.5"
          label="Section"
          allLabel="Toutes sections"
        />
      )}

      <Button
        type="button"
        variant="ghost"
        onClick={onReset}
        className="h-11 self-start px-3 text-[13px] font-bold text-coach-green-text hover:bg-white/10"
      >
        Réinitialiser
      </Button>
    </CollapsibleFilterPanel>
  );
}
