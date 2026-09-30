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
import type { TeamOption } from '../useBackofficeTeamsViewModel'
import { useAddOpponentDialogViewModel } from '../useAddOpponentDialogViewModel'

interface AddOpponentDialogProps {
  targetTeam: Team | null
  teamOptions: TeamOption[]
  onClose: () => void
}

// specs/team-opponents.md UI design, "Dialogue « Ajouter un adversaire »" —
// modeled on TeamFormDialog, remounted via `key` on the originating team.
export function AddOpponentDialog({ targetTeam, teamOptions, onClose }: AddOpponentDialogProps) {
  if (!targetTeam) return null

  return <AddOpponentDialogContent key={targetTeam.id} targetTeam={targetTeam} teamOptions={teamOptions} onClose={onClose} />
}

function AddOpponentDialogContent({
  targetTeam,
  teamOptions,
  onClose,
}: AddOpponentDialogProps & { targetTeam: Team }) {
  const vm = useAddOpponentDialogViewModel({ initialTeamId: targetTeam.id, onSuccess: onClose })

  return (
    <Dialog open onOpenChange={(open) => !open && !vm.isSubmitting && onClose()}>
      <DialogContent className="sm:max-w-lg">
        <DialogHeader>
          <DialogTitle>Ajouter un adversaire</DialogTitle>
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
            <Label htmlFor="opponent-name" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Nom de l'équipe
            </Label>
            <Input
              id="opponent-name"
              placeholder="Ex. AS Exemple"
              required
              autoFocus
              disabled={vm.isSubmitting}
              value={vm.name}
              onChange={(event) => vm.setName(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="opponent-team" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Équipe du club concernée
            </Label>
            <Select value={vm.teamId} onValueChange={vm.setTeamId} disabled={vm.isSubmitting}>
              <SelectTrigger id="opponent-team" className="h-11 w-full rounded-xl">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {teamOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* A business rule stated by the mockup itself, not a decoration. */}
          <p className="text-xs text-muted-foreground italic">
            Les adversaires sont des équipes externes au club, reliées à une de vos équipes pour créer des convocations de match.
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
              {vm.isSubmitting ? 'Ajout…' : 'Ajouter'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
