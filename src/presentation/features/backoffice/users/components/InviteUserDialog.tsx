import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { useInviteUserDialogViewModel } from '../useInviteUserDialogViewModel'

interface InviteUserDialogProps {
  isOpen: boolean
  onClose: () => void
}

// specs/web-users.md UI design, "Bouton « + Inviter un utilisateur » et son
// dialogue" (export 5, PO-WU-01 résolu) — two required fields, both
// submitted (unlike UserEditDialog below, where only one of the two visible
// fields is). Remounted via `if (!isOpen) return null`, same pattern as
// MembershipFormDialog/AssignCoachDialog.
export function InviteUserDialog({ isOpen, onClose }: InviteUserDialogProps) {
  if (!isOpen) return null

  return <InviteUserDialogContent onClose={onClose} />
}

function InviteUserDialogContent({ onClose }: { onClose: () => void }) {
  const vm = useInviteUserDialogViewModel({ onSuccess: onClose })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Inviter un utilisateur</DialogTitle>
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
            <Label htmlFor="invite-user-full-name" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Nom complet
            </Label>
            <Input
              id="invite-user-full-name"
              required
              disabled={vm.isSubmitting}
              value={vm.fullName}
              onChange={(event) => vm.setFullName(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="invite-user-email" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Email
            </Label>
            <Input
              id="invite-user-email"
              type="email"
              required
              disabled={vm.isSubmitting}
              value={vm.email}
              onChange={(event) => vm.setEmail(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* §2.5/§7 of the spec — the mockup's own italic copy is neither
              reused ("OPEN-2" internal marker) nor accurate anymore (the
              account is created at SEND time, not at acceptance, §2.5): this
              is the clean replacement copy the spec itself settles on. */}
          <p className="text-xs text-muted-foreground italic">
            Le compte apparaît immédiatement dans la liste, au statut Invité — avant même que l&rsquo;invitation soit acceptée.
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
              {vm.isSubmitting ? 'Envoi…' : 'Envoyer l’invitation'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
