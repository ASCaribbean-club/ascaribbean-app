import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Textarea } from '@presentation/shared/components/ui/textarea'
import { type InviteUserDialogTarget, useInviteUserDialogViewModel } from '../useInviteUserDialogViewModel'

interface InviteUserDialogProps {
  target: InviteUserDialogTarget | null
  onClose: () => void
}

// specs/web-users-invitation-links.md §4 — replaces the e-mail-invitation
// dialog (CLAUDE.md §7: no second dialog component for the reissue or
// reset-password modes, this one is reused as-is). No email is sent by the
// application anymore — the dialog produces a ready-to-share French message
// with Copier/Partager, which the admin sends themselves via WhatsApp/SMS/in
// person.
export function InviteUserDialog({ target, onClose }: InviteUserDialogProps) {
  if (!target) return null

  return <InviteUserDialogContent target={target} onClose={onClose} />
}

function InviteUserDialogContent({ target, onClose }: { target: InviteUserDialogTarget; onClose: () => void }) {
  const vm = useInviteUserDialogViewModel({ target, onClose: onClose })

  const dialogTitle = vm.mode === 'create' ? 'Inviter un utilisateur' : vm.mode === 'reissue' ? 'Lien d’invitation' : 'Réinitialiser le mot de passe'

  return (
    <Dialog open onOpenChange={(open) => !open && vm.close()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{dialogTitle}</DialogTitle>
        </DialogHeader>

        {!vm.link && target.mode === 'create' && (
          <form
            className="flex min-w-0 flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              vm.generate()
            }}
          >
            {vm.generateErrorMessage && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{vm.generateErrorMessage}</AlertDescription>
              </Alert>
            )}

            <div className="flex flex-col gap-1.5">
              <Label htmlFor="invite-user-full-name" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Nom complet
              </Label>
              <Input
                id="invite-user-full-name"
                required
                disabled={vm.isGenerating}
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
                disabled={vm.isGenerating}
                value={vm.email}
                onChange={(event) => vm.setEmail(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <DialogFooter>
              <Button type="button" variant="outline" disabled={vm.isGenerating} onClick={vm.close} className="h-11 rounded-full">
                Annuler
              </Button>
              <Button
                type="submit"
                disabled={!vm.canSubmit}
                className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
              >
                {vm.isGenerating ? 'Génération…' : 'Générer le lien'}
              </Button>
            </DialogFooter>
          </form>
        )}

        {/* specs/web-users-invitation-links.md §4 "Users list — new row
            action" — re-issue/reset-password mode's own FIRST step: nothing
            is generated until this button is tapped (never on dialog open),
            the same "no one-click generate-and-copy" rule as below applied
            to the generation itself. */}
        {!vm.link && (target.mode === 'reissue' || target.mode === 'reset-password') && (
          <div className="flex min-w-0 flex-col gap-4">
            {vm.generateErrorMessage && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{vm.generateErrorMessage}</AlertDescription>
              </Alert>
            )}
            <p className="text-sm text-muted-foreground">
              {target.mode === 'reissue'
                ? `Génère un nouveau lien d’activation pour ${target.fullName}.`
                : `Génère un lien de réinitialisation de mot de passe pour ${target.fullName}.`}
            </p>
            <DialogFooter>
              <Button type="button" variant="outline" disabled={vm.isGenerating} onClick={vm.close} className="h-11 rounded-full">
                Annuler
              </Button>
              <Button
                type="button"
                disabled={!vm.canSubmit}
                onClick={vm.generate}
                className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
              >
                {vm.isGenerating ? 'Génération…' : target.mode === 'reissue' ? 'Générer un nouveau lien' : 'Générer le lien'}
              </Button>
            </DialogFooter>
          </div>
        )}

        {vm.link && (
          <div className="flex min-w-0 flex-col gap-4">
            {/* §1.5 — shown for a re-issued or reset-password link:
                generating a new one is understood (per GoTrue's documented
                one-token-per-type storage, not verified against a live test
                — see this feature's own findings) to invalidate whichever
                link was previously sent to this member. */}
            {vm.mode !== 'create' && (
              <Alert role="status">
                <AlertDescription>L’ancien lien envoyé à ce membre ne fonctionnera plus.</AlertDescription>
              </Alert>
            )}

            <p className="text-sm text-muted-foreground">
              Envoyez ce message personnellement à ce membre (WhatsApp, SMS, ou en personne) — jamais dans une conversation de groupe.
            </p>

            {/* break-all — the activation URL inside this message is one
                long unbroken token, and Textarea's field-sizing:content
                otherwise grows the box to fit it on one line rather than
                wrapping (CLAUDE.md §6's min-w-0 piège, same root cause:
                content with no natural break point forcing a flex/grid
                item wider than its container — here inside the box rather
                than at the box's own edge, min-w-0 alone doesn't fix it). */}
            <Textarea
              readOnly
              value={vm.message ?? ''}
              rows={9}
              className="rounded-xl text-sm break-all"
              onFocus={(event) => event.target.select()}
            />

            {vm.clipboardError && (
              <Alert variant="destructive" role="alert">
                <AlertDescription>{vm.clipboardError.message}</AlertDescription>
              </Alert>
            )}
            {vm.copyState === 'copied' && !vm.clipboardError && (
              <p role="status" className="text-xs font-semibold text-coach-green">
                Message copié
              </p>
            )}

            <DialogFooter className="flex-wrap gap-2">
              <Button type="button" variant="outline" onClick={vm.close} className="h-11 rounded-full">
                Fermer
              </Button>
              {vm.canShare && (
                <Button type="button" variant="outline" onClick={vm.shareMessage} className="h-11 rounded-full">
                  Partager
                </Button>
              )}
              <Button
                type="button"
                onClick={vm.copyMessage}
                className="h-11 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green"
              >
                Copier le message
              </Button>
            </DialogFooter>
          </div>
        )}
      </DialogContent>
    </Dialog>
  )
}
