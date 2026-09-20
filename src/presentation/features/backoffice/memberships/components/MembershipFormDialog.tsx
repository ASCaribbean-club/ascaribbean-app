import type { MembershipStatus } from '@domain/entities/membership'
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

// §2.4 — the demand's three values, mapped to the existing MembershipStatus
// union and MembershipStatusBadge's own French labels (AC-WM-10: no new
// value, no relabeling).
const STATUS_OPTIONS: { value: MembershipStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspendue' },
]

interface MembershipFormDialogProps {
  isOpen: boolean
  onClose: () => void
}

// specs/web-memberships.md §1/UI design (amendement du 2026-09-17) — the
// mockup's own 5 fields for "Nouvelle adhésion": UTILISATEUR, SAISON,
// NUMÉRO DE LICENCE, STATUT, VALIDE JUSQU'AU. /admin/memberships is this
// component's ONLY caller (specs/web-users-membership-column.md §2.6 — the
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
            {noUsers && <p className="text-xs text-muted-foreground">Aucun compte disponible pour le moment.</p>}
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
            <Label htmlFor="membership-status" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Statut
            </Label>
            <Select
              value={vm.values.status}
              onValueChange={(value) => vm.setStatus(value as MembershipStatus)}
              disabled={vm.isSubmitting}
            >
              <SelectTrigger id="membership-status" className="h-11 rounded-xl">
                <SelectValue placeholder="Choisir…" />
              </SelectTrigger>
              <SelectContent>
                {STATUS_OPTIONS.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="membership-valid-until" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Valide jusqu&rsquo;au
            </Label>
            {/* PO-WM-12 (open, non-blocking) — left fully manual rather than
                pre-filled from the selected season's own end date: neither
                the mockup nor any cadrage document settles whether that
                default is wanted, so this pass doesn't guess at it. */}
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
