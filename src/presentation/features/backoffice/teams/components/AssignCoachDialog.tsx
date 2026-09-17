import type { Team } from '@domain/entities/team'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Checkbox } from '@presentation/shared/components/ui/checkbox'
import {
  Dialog,
  DialogContent,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@presentation/shared/components/ui/dialog'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { useAssignCoachDialogViewModel } from '../useAssignCoachDialogViewModel'

interface AssignCoachDialogProps {
  targetTeam: Team | null
  onClose: () => void
}

// specs/section-and-teams.md UI design, "Nouveau composant —
// AssignCoachDialog" — no precedent in this backoffice (unlike
// SectionFormDialog/TeamFormDialog): writes a DIFFERENT resource
// (public.user_roles, never public.teams/public.sections, §2.9), no "edit"
// mode, no "Enregistrer" button. One component, remounted (via `key`) per
// target team, same reasoning as the two Xxx FormDialogs.
export function AssignCoachDialog({ targetTeam, onClose }: AssignCoachDialogProps) {
  if (!targetTeam) return null

  return <AssignCoachDialogContent key={targetTeam.id} targetTeam={targetTeam} onClose={onClose} />
}

function AssignCoachDialogContent({ targetTeam, onClose }: { targetTeam: Team; onClose: () => void }) {
  const vm = useAssignCoachDialogViewModel({ targetTeam, onSuccess: onClose })

  const noUsers = !vm.isLoadingOptions && vm.users.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Assigner un rôle</DialogTitle>
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
            <Label htmlFor="assign-coach-user" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Utilisateur
            </Label>
            <Select value={vm.userId} onValueChange={vm.setUserId} disabled={vm.isSubmitting || noUsers}>
              <SelectTrigger id="assign-coach-user" className="h-11 rounded-xl">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {vm.users.map((candidate) => (
                  <SelectItem key={candidate.id} value={candidate.id}>
                    {candidate.fullName}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {/* PO-ST-11 amendé — au premier usage, aucun compte ne porte
                encore le rôle coach : la liste peut être vide, état à rendre
                intelligible plutôt qu'à laisser muet. */}
            {noUsers && <p className="text-xs text-muted-foreground">Aucun compte disponible pour le moment.</p>}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="assign-coach-role" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Rôle
            </Label>
            {/* §3/AC-ST-45/PO-ST-12a — deliberate deviation from the mockup's
                open "Choisir…" dropdown: only ONE role can be assigned from
                this screen, so it is rendered LOCKED rather than as a real
                choice, to never visually suggest a freedom the RBAC forbids. */}
            <Select value="coach" disabled>
              <SelectTrigger id="assign-coach-role" className="h-11 rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="coach">Coach</SelectItem>
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">Seul le rôle Coach peut être assigné depuis cet écran.</p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Équipes</Label>
            <div className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-border">
              {vm.teamOptions.map((option) => (
                <label key={option.id} htmlFor={`assign-coach-team-${option.id}`} className="flex min-h-11 items-center gap-3 border-b border-border px-3 py-2 last:border-b-0">
                  <Checkbox
                    id={`assign-coach-team-${option.id}`}
                    checked={vm.checkedTeamIds.has(option.id)}
                    onCheckedChange={() => vm.toggleTeam(option.id)}
                    disabled={vm.isSubmitting}
                  />
                  <span className="text-sm">{option.label}</span>
                </label>
              ))}
            </div>
          </div>

          {/* §1/§2.8 — the mockup's own italic copy, a business rule, not a
              decoration. */}
          <p className="text-xs text-muted-foreground italic">
            Un coach peut être assigné à plusieurs équipes : cochez toutes celles concernées.
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
              {vm.isSubmitting ? 'Assignation…' : 'Assigner'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
