import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Checkbox } from '@presentation/shared/components/ui/checkbox'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { formatRole } from '@presentation/shared/formatters/role-labels'
import { useAssignRoleDialogViewModel, type AssignableRole } from '../useAssignRoleDialogViewModel'

// §2.6/AC-WU-06 — exactly the seven non-admin roles, 'admin' never an
// option (confort only — the real barrier is user_roles_insert_assign_role's
// own `with check`, §2.6a).
const ASSIGNABLE_ROLES: AssignableRole[] = ['player', 'coach', 'section-manager', 'authorized-officer', 'treasurer', 'medical-referent', 'volunteer']

interface AssignRoleDialogProps {
  target: AdminUserDirectoryEntry | null
  onClose: () => void
}

// specs/web-users.md §2.6/UI design "« + Rôle » — nouveau dialogue
// généralisé, AssignRoleDialog" (export 2, PO-WU-03 résolu) — a NEW
// component, distinct from AssignCoachDialog (which stays locked on
// 'coach', unchanged, the /admin/teams path, AC-WU-31). No fixed height on
// DialogContent below (none of this backoffice's dialogs set one) — it
// grows/shrinks with the conditional scope field exactly like
// AssignCoachDialog already does.
export function AssignRoleDialog({ target, onClose }: AssignRoleDialogProps) {
  if (!target) return null

  return <AssignRoleDialogContent key={target.id} target={target} onClose={onClose} />
}

function AssignRoleDialogContent({ target, onClose }: { target: AdminUserDirectoryEntry; onClose: () => void }) {
  const vm = useAssignRoleDialogViewModel({ targetUserId: target.id, onSuccess: onClose })

  const noTeams = !vm.isLoadingOptions && vm.teamOptions.length === 0
  const noSections = !vm.isLoadingOptions && vm.sectionOptions.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          {/* §2.6c "Câblage" — the target's own name recalled in the title,
              never repeated in the body (the mockup shows no such repeat). */}
          <DialogTitle>Assigner un rôle à {target.fullName}</DialogTitle>
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
            <Label htmlFor="assign-role-role" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Rôle
            </Label>
            <Select value={vm.role} onValueChange={(value) => vm.setRole(value as AssignableRole)} disabled={vm.isSubmitting}>
              <SelectTrigger id="assign-role-role" className="h-11 rounded-xl">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {ASSIGNABLE_ROLES.map((role) => (
                  <SelectItem key={role} value={role}>
                    {formatRole(role)}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          {/* §2.6c — nothing rendered until a role is chosen, and nothing at
              all for the four club-wide roles: never a disabled field. */}
          {vm.role === 'player' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-role-team" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Équipe
              </Label>
              <Select value={vm.teamId} onValueChange={vm.setTeamId} disabled={vm.isSubmitting || noTeams}>
                <SelectTrigger id="assign-role-team" className="h-11 rounded-xl">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {vm.teamOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {noTeams && <p className="text-xs text-muted-foreground">Aucune équipe disponible pour le moment.</p>}
            </div>
          )}

          {vm.role === 'coach' && (
            <div className="flex flex-col gap-1.5">
              <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Équipes</Label>
              {/* §2.6c — the SAME checkbox list AssignCoachDialog already
                  renders, reused rather than redrawn. */}
              <div className="flex max-h-64 flex-col overflow-y-auto rounded-xl border border-border">
                {vm.teamOptions.map((option) => (
                  <label
                    key={option.id}
                    htmlFor={`assign-role-team-${option.id}`}
                    className="flex min-h-11 items-center gap-3 border-b border-border px-3 py-2 last:border-b-0"
                  >
                    <Checkbox
                      id={`assign-role-team-${option.id}`}
                      checked={vm.checkedTeamIds.has(option.id)}
                      onCheckedChange={() => vm.toggleTeam(option.id)}
                      disabled={vm.isSubmitting}
                    />
                    <span className="text-sm">{option.label}</span>
                  </label>
                ))}
              </div>
              {noTeams && <p className="text-xs text-muted-foreground">Aucune équipe disponible pour le moment.</p>}
              {/* §2.6c — the same reminder AssignCoachDialog already shows,
                  reproduced verbatim rather than reworded. */}
              <p className="text-xs text-muted-foreground italic">
                Un coach peut être assigné à plusieurs équipes : cochez toutes celles concernées.
              </p>
            </div>
          )}

          {vm.role === 'section-manager' && (
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="assign-role-section" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Section
              </Label>
              <Select value={vm.sectionId} onValueChange={vm.setSectionId} disabled={vm.isSubmitting || noSections}>
                <SelectTrigger id="assign-role-section" className="h-11 rounded-xl">
                  <SelectValue placeholder="Choisir…" />
                </SelectTrigger>
                <SelectContent>
                  {vm.sectionOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              {noSections && <p className="text-xs text-muted-foreground">Aucune section disponible pour le moment.</p>}
            </div>
          )}

          {/* §2.6c "Câblage" — the mockup's own italic copy, minus its
              internal "OPEN-5" marker and its now-false second half
              (user_roles_scope_check DOES exist, §2.6c) — this is the clean
              replacement copy the spec itself settles on. */}
          <p className="text-xs text-muted-foreground italic">La portée requise (équipe, section, ou aucune) dépend du rôle choisi.</p>

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
