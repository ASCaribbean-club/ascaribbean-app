import type { Team } from '@domain/entities/team'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import type { TeamDialogState } from '../useBackofficeTeamsViewModel'
import { useTeamFormDialogViewModel } from '../useTeamFormDialogViewModel'

interface TeamFormDialogProps {
  dialog: TeamDialogState
  onClose: () => void
}

// specs/section-and-teams.md UI design, "TeamFormDialog" — modeled on
// SectionFormDialog.tsx/SeasonFormDialog.tsx. One component, remounted (via
// `key` below) rather than reset by a useEffect, whenever the target row or
// mode changes.
export function TeamFormDialog({ dialog, onClose }: TeamFormDialogProps) {
  if (!dialog) return null

  return <TeamFormDialogContent key={dialog.mode === 'edit' ? dialog.team.id : 'create'} dialog={dialog} onClose={onClose} />
}

const DIALOG_TITLE = {
  create: 'Créer une équipe',
  edit: "Modifier l'équipe",
} as const

const SUBMIT_LABEL = {
  create: 'Créer',
  edit: 'Enregistrer',
} as const

const SUBMITTING_LABEL = {
  create: 'Création…',
  edit: 'Enregistrement…',
} as const

function TeamFormDialogContent({ dialog, onClose }: TeamFormDialogProps & { dialog: NonNullable<TeamDialogState> }) {
  const team: Team | null = dialog.mode === 'edit' ? dialog.team : null
  const vm = useTeamFormDialogViewModel({ mode: dialog.mode, team, onSuccess: onClose })

  // §2.3/AC-ST-23/PO-ST-11 — the create/edit dialog must stay intelligible
  // when no section or no season exists yet, rather than offering two
  // silently empty dropdowns.
  const noSections = !vm.isLoadingOptions && vm.sections.length === 0
  const noSeasons = !vm.isLoadingOptions && vm.seasons.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLE[dialog.mode]}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            vm.submit()
          }}
        >
          {vm.errorMessage && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          )}

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-name" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Nom
            </Label>
            <Input
              id="team-name"
              placeholder="Ex. Groupe A"
              required
              disabled={vm.isSubmitting}
              value={vm.values.name}
              onChange={(event) => vm.setName(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-section" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Section
            </Label>
            <Select
              value={vm.values.sectionId}
              onValueChange={vm.setSectionId}
              disabled={vm.isSubmitting || noSections}
            >
              <SelectTrigger id="team-section" className="h-11 rounded-xl">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {vm.sections.map((section) => (
                  <SelectItem key={section.id} value={section.id}>
                    {section.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noSections && (
              <p className="text-xs text-muted-foreground">
                Aucune section n'existe encore — créez-en une avant de créer une équipe.
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="team-season" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Saison
            </Label>
            <Select value={vm.values.seasonId} onValueChange={vm.setSeasonId} disabled={vm.isSubmitting || noSeasons}>
              <SelectTrigger id="team-season" className="h-11 rounded-xl">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {vm.seasons.map((season) => (
                  <SelectItem key={season.id} value={season.id}>
                    {season.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {noSeasons && (
              <p className="text-xs text-muted-foreground">
                Aucune saison n'existe encore — créez-en une avant de créer une équipe.
              </p>
            )}
          </div>

          {/* §2.2 — a business rule stated by the mockup itself, not a
              decoration: never remove this to "lighten" the form. */}
          <p className="text-xs text-muted-foreground italic">
            Section et saison sont obligatoires : une équipe est propre à une saison et n'est jamais réutilisée d'une saison à l'autre.
          </p>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={vm.isSubmitting} onClick={onClose} className="h-11 rounded-full">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!vm.canSubmit}
              className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
            >
              {vm.isSubmitting ? SUBMITTING_LABEL[dialog.mode] : SUBMIT_LABEL[dialog.mode]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
