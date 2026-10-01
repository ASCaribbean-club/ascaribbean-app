import type { AdminConvocationPeriod } from '@domain/entities/admin-convocation'
import type { ConvocationType } from '@domain/entities/convocation'
import { Button } from '@presentation/shared/components/ui/button'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { Toggle } from '@presentation/shared/components/ui/toggle'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import { cn } from '@presentation/shared/lib/utils'
import type { BackofficeConvocationsViewModel } from '../useBackofficeConvocationsViewModel'

const ALL = 'all'

const PERIOD_OPTIONS: { value: AdminConvocationPeriod; label: string }[] = [
  { value: 'upcoming', label: 'À venir' },
  { value: 'past', label: 'Passées' },
  { value: 'all', label: 'Toutes' },
]

const TYPE_OPTIONS: { value: ConvocationType; label: string }[] = [
  { value: 'training', label: 'Entraînement' },
  { value: 'match', label: 'Match' },
  { value: 'meeting', label: 'Réunion' },
]

type ConvocationFiltersProps = {
  vm: Pick<
    BackofficeConvocationsViewModel,
    | 'seasons'
    | 'sections'
    | 'teamOptions'
    | 'seasonId'
    | 'sectionId'
    | 'teamId'
    | 'type'
    | 'period'
    | 'viewMode'
    | 'unrecordedOnly'
    | 'unrecordedCount'
    | 'isFilterActive'
    | 'setSeasonId'
    | 'setSectionId'
    | 'setTeamId'
    | 'setType'
    | 'setPeriod'
    | 'toggleUnrecordedOnly'
    | 'resetFilters'
  >
}

// specs/web-create-convocation.md UI design "Filtres, tous côté serveur" —
// season, section, team, type, period, reset, and the "Présences non saisies
// (N)" pastille. Holds no filtering logic: every change flows into the
// ViewModel, whose state is what re-triggers the server query (AC-WC-06).
// Controls are `h-11` (CLAUDE.md §6, AC-WC-35); "Réinitialiser" only renders
// when a filter differs from its default.
export function ConvocationFilters({ vm }: ConvocationFiltersProps) {
  return (
    <div className="flex flex-col gap-3">
      <div className="flex flex-wrap items-center gap-3">
        <FilterSelect label="Saison" value={vm.seasonId ?? ''} onChange={vm.setSeasonId} placeholder="Saison">
          {vm.seasons.map((season) => (
            <SelectItem key={season.id} value={season.id}>
              {season.label}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Section"
          value={vm.sectionId ?? ALL}
          onChange={(value) => vm.setSectionId(value === ALL ? null : value)}
          placeholder="Toutes sections"
        >
          <SelectItem value={ALL}>Toutes sections</SelectItem>
          {vm.sections.map((section) => (
            <SelectItem key={section.id} value={section.id}>
              {section.name}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Équipe"
          value={vm.teamId ?? ALL}
          onChange={(value) => vm.setTeamId(value === ALL ? null : value)}
          placeholder="Toutes équipes"
        >
          <SelectItem value={ALL}>Toutes équipes</SelectItem>
          {vm.teamOptions.map((team) => (
            <SelectItem key={team.id} value={team.id}>
              {team.name}
            </SelectItem>
          ))}
        </FilterSelect>

        <FilterSelect
          label="Type"
          value={vm.type ?? ALL}
          onChange={(value) => vm.setType(value === ALL ? null : (value as ConvocationType))}
          placeholder="Tous types"
        >
          <SelectItem value={ALL}>Tous types</SelectItem>
          {TYPE_OPTIONS.map((option) => (
            <SelectItem key={option.value} value={option.value}>
              {option.label}
            </SelectItem>
          ))}
        </FilterSelect>

        {/* A segment is always active: Radix reports '' on a re-click of the
            active one, which is ignored. */}
        {vm.viewMode === 'list' && (
          <ToggleGroup
            type="single"
            variant="outline"
            value={vm.period}
            onValueChange={(value) => value && vm.setPeriod(value as AdminConvocationPeriod)}
            aria-label="Période"
            spacing={0}
          >
            {PERIOD_OPTIONS.map((option) => (
              <ToggleGroupItem key={option.value} value={option.value} className="h-11 px-4">
                {option.label}
              </ToggleGroupItem>
            ))}
          </ToggleGroup>
        )}

        {vm.isFilterActive && (
          <Button type="button" variant="outline" onClick={vm.resetFilters} className="h-11 rounded-full">
            Réinitialiser
          </Button>
        )}
      </div>

      <div>
        <Toggle
          variant="outline"
          pressed={vm.unrecordedOnly}
          onPressedChange={vm.toggleUnrecordedOnly}
          className={cn(
            'h-8 rounded-full px-3 text-xs',
            vm.unrecordedOnly && 'border-coach-amber/60 bg-coach-amber/15 text-coach-amber hover:bg-coach-amber/20 hover:text-coach-amber',
          )}
        >
          Présences non saisies ({vm.unrecordedCount})
        </Toggle>
      </div>
    </div>
  )
}

interface FilterSelectProps {
  label: string
  value: string
  onChange: (value: string) => void
  placeholder: string
  children: React.ReactNode
}

function FilterSelect({ label, value, onChange, placeholder, children }: FilterSelectProps) {
  return (
    <div className="flex min-w-0 flex-col">
      <Label className="sr-only">{label}</Label>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger aria-label={label} className="h-11 w-44 min-w-0 rounded-xl">
          <SelectValue placeholder={placeholder} />
        </SelectTrigger>
        <SelectContent>{children}</SelectContent>
      </Select>
    </div>
  )
}
