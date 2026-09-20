import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { useUserEditDialogViewModel } from '../useUserEditDialogViewModel'

interface UserEditDialogProps {
  target: AdminUserDirectoryEntry | null
  onClose: () => void
}

// specs/web-users.md §2.7/UI design "Icône crayon « Modifier l'utilisateur »
// et son dialogue" (export 1, PO-WU-02 résolu) — TWO fields rendered
// (mockup), only ONE ever submitted: NOM COMPLET (editable, required),
// EMAIL (disabled, never in the mutation payload, §2.7). Remounted via
// `key={target.id}`, same pattern as AssignCoachDialog's `key={targetTeam.id}`.
export function UserEditDialog({ target, onClose }: UserEditDialogProps) {
  if (!target) return null

  return <UserEditDialogContent key={target.id} target={target} onClose={onClose} />
}

function UserEditDialogContent({ target, onClose }: { target: AdminUserDirectoryEntry; onClose: () => void }) {
  const vm = useUserEditDialogViewModel({ target, onSuccess: onClose })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Modifier l&rsquo;utilisateur</DialogTitle>
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
            <Label htmlFor="user-edit-full-name" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Nom complet
            </Label>
            <Input
              id="user-edit-full-name"
              required
              disabled={vm.isSubmitting}
              value={vm.fullName}
              onChange={(event) => vm.setFullName(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="user-edit-email" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Email
            </Label>
            {/* §2.7/AC-WU-38/§7 of the spec — rendered but disabled, never
                submitted; the caption BELOW says why rather than leaving a
                silently dead field (§7: "un administrateur qui clique dans
                un champ inerte sans explication est un ticket de
                support"). The real, non-bypassable guarantee is the
                users_update_admin RLS policy/grant — this disabled
                attribute is UX only. */}
            <Input id="user-edit-email" type="email" disabled value={vm.email} className="h-11 rounded-xl" />
            <p className="text-xs text-muted-foreground">Non modifiable — identifie la connexion du compte.</p>
          </div>

          <DialogFooter>
            <Button type="button" variant="outline" disabled={vm.isSubmitting} onClick={onClose} className="h-11 rounded-full">
              Annuler
            </Button>
            <Button
              type="submit"
              disabled={!vm.canSubmit}
              className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
            >
              {vm.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
