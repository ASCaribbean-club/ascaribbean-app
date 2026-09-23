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
import { useMembershipFormDialogViewModel } from '../useMembershipFormDialogViewModel'

interface MembershipFormDialogProps {
  isOpen: boolean
  onClose: () => void
}

// specs/web-memberships.md §1/UI design (amendement du 2026-09-17) — the
// mockup's own fields for "Nouvelle adhésion": UTILISATEUR, SAISON, NUMÉRO
// DE LICENCE, VALIDE JUSQU'AU. The mockup's own STATUT field is deliberately
// dropped here (developer decision, 2026-09-23): a brand-new membership
// always starts 'pending' — CreateMembershipUseCase rejects 'active' outright
// (a new membership can never have a settled cotisation), so offering the
// full 3-way choice at creation only invited a dead-end pick. Promoting to
// 'active'/'suspended' stays the edit row's job (MembershipEditRow, unchanged
// — its own 3-option STATUT selector is untouched). /admin/memberships is
// this component's ONLY caller (specs/web-users-membership-column.md §2.6 — the
// "Créer / renouveler l'adhésion" entry point on /admin/users' own row,
// which used to reuse this component minus its UTILISATEUR field, is
// retired: that screen never writes a membership any more). Modification of
// an EXISTING membership still never goes through this component (or any
// dialog) — it's the inline expandable row, MembershipEditRow — which is
// why there is no "mode"/edited-row prop here and no "Cotisation totale
// (€)" field (§2.1 — deliberately absent from this dialog, only the edit
// row carries it). Modeled on TeamFormDialog.tsx/AssignCoachDialog.tsx
// (dropdowns populated from admin directory reads). Remounted (via `key` in
// the parent, or via `isOpen` unmounting entirely) rather than reset by a
// useEffect, each time it's reopened.
export function MembershipFormDialog({ isOpen, onClose }: MembershipFormDialogProps) {
  if (!isOpen) return null

  return <MembershipFormDialogContent onClose={onClose} />
}

function MembershipFormDialogContent({ onClose }: { onClose: () => void }) {
  const vm = useMembershipFormDialogViewModel({ onSuccess: onClose })

  const noUsers = !vm.isLoadingOptions && vm.users.length === 0
  const noSeasons = !vm.isLoadingOptions && vm.seasons.length === 0

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Nouvelle adhésion</DialogTitle>
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
            <Label htmlFor="membership-user" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Utilisateur
            </Label>
            {/* vm.users already excludes accounts holding a live membership
                for the currently selected season (see the ViewModel) — the
                DB's own unique index would reject that pair anyway, but
                surfacing that only after a failed submit is worse UX than
                not offering the choice. */}
            <Select value={vm.values.userId} onValueChange={vm.setUserId} disabled={vm.isSubmitting || noUsers}>
              <SelectTrigger id="membership-user" className="h-11 rounded-xl">
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
            {noUsers && (
              <p className="text-xs text-muted-foreground">
                {vm.values.seasonId ? 'Tous les comptes ont déjà une adhésion pour cette saison.' : 'Aucun compte disponible pour le moment.'}
              </p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="membership-season" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Saison
            </Label>
            <Select value={vm.values.seasonId} onValueChange={vm.setSeasonId} disabled={vm.isSubmitting || noSeasons}>
              <SelectTrigger id="membership-season" className="h-11 rounded-xl">
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
              <p className="text-xs text-muted-foreground">Aucune saison n'existe encore — créez-en une avant de créer une adhésion.</p>
            )}
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="membership-licence" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Numéro de licence
            </Label>
            {/* §2.1/AC-WM-15 — optional, no `required`: an empty licence
                number is a normal case (mockup row 1), never rejected. */}
            <Input
              id="membership-licence"
              placeholder="Ex. FR-12345"
              disabled={vm.isSubmitting}
              value={vm.values.licenceNumber}
              onChange={(event) => vm.setLicenceNumber(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="membership-valid-until" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Valide jusqu&rsquo;au
            </Label>
            {/* PO-WM-12 resolved (developer decision, 2026-09-23) — defaults
                to the selected season's own end date (see the ViewModel's
                effectiveValidUntil); still a plain editable date input, so
                typing a different value overrides the default. */}
            <Input
              id="membership-valid-until"
              type="date"
              required
              disabled={vm.isSubmitting}
              value={vm.values.validUntil}
              onChange={(event) => vm.setValidUntil(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          {/* §1 — the mockup's own italic copy, a business rule, not a
              decoration: never remove this to "lighten" the form. */}
          <p className="text-xs text-muted-foreground italic">
            Un renouvellement insère toujours une nouvelle ligne (jamais de mise à jour) pour préserver l'historique par saison.
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
              {vm.isSubmitting ? 'Enregistrement…' : 'Enregistrer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
