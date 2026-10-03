import type { Section } from '@domain/entities/section'
import type { Team } from '@domain/entities/team'
import { Button } from '@presentation/shared/components/ui/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { FIELD_CLASSNAME } from './field-style'
import { FormField } from './FormField'

interface SectionTeamPickerProps {
  sections: Section[]
  selectedSectionId: string | null
  selectedTeamId: string | null
  teams: Team[]
  isLoadingTeams: boolean
  hasTeamsError: boolean
  hasNoTeamInSection: boolean
  retryLoadTeams: () => void
  onPickSection: (sectionId: string) => void
  onPickTeam: (teamId: string) => void
}

// specs/mobile-dirigeant-habilite.md §1.4 / UI design §5 — Section then
// Équipe, rendered at the top of the convocation form for the Dirigeant only
// (the coach inherits its team through the route). Two stacked fields, not
// side by side: team names are long and would truncate at 320px.
export function SectionTeamPicker({
  sections,
  selectedSectionId,
  selectedTeamId,
  teams,
  isLoadingTeams,
  hasTeamsError,
  hasNoTeamInSection,
  retryLoadTeams,
  onPickSection,
  onPickTeam,
}: SectionTeamPickerProps) {
  return (
    <div className="flex flex-col gap-5">
      <FormField label="Section" htmlFor="sectionId">
        <Select value={selectedSectionId ?? ''} onValueChange={onPickSection}>
          <SelectTrigger id="sectionId" className={FIELD_CLASSNAME}>
            <SelectValue placeholder="Choisir une section" />
          </SelectTrigger>
          <SelectContent>
            {sections.map((section) => (
              <SelectItem key={section.id} value={section.id}>
                {section.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
      </FormField>

      <FormField label="Équipe" htmlFor="teamId">
        <Select
          value={selectedTeamId ?? ''}
          onValueChange={onPickTeam}
          disabled={!selectedSectionId || isLoadingTeams || hasTeamsError || hasNoTeamInSection}
        >
          <SelectTrigger id="teamId" className={FIELD_CLASSNAME}>
            <SelectValue
              placeholder={
                isLoadingTeams ? 'Chargement des équipes…' : selectedSectionId ? 'Choisir une équipe' : 'Choisir d’abord une section'
              }
            />
          </SelectTrigger>
          <SelectContent>
            {teams.map((team) => (
              <SelectItem key={team.id} value={team.id}>
                {team.name}
              </SelectItem>
            ))}
          </SelectContent>
        </Select>
        {hasNoTeamInSection && <p className="text-[12px] text-white/60">Aucune équipe cette saison pour cette section.</p>}
        {hasTeamsError && (
          <div className="flex flex-col items-start gap-2">
            <p role="alert" className="text-[12px] font-semibold text-coach-red-text">
              Impossible de charger les équipes.
            </p>
            <Button type="button" variant="outline" onClick={retryLoadTeams} className="h-11 border-white/20 text-white">
              Réessayer
            </Button>
          </div>
        )}
      </FormField>
    </div>
  )
}
