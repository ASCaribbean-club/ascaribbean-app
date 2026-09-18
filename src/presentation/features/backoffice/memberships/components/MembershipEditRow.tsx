import type { MembershipStatus } from '@domain/entities/membership'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { TableCell, TableRow } from '@presentation/shared/components/ui/table'
import type { MembershipAdminRow } from '../useBackofficeMembershipsViewModel'
import { useMembershipEditRowViewModel } from '../useMembershipEditRowViewModel'
import { PaymentHistoryList } from './PaymentHistoryList'

// §2.4 — same three values/labels as MembershipFormDialog, AC-WM-10.
const STATUS_OPTIONS: { value: MembershipStatus; label: string }[] = [
  { value: 'pending', label: 'En attente' },
  { value: 'active', label: 'Active' },
  { value: 'suspended', label: 'Suspendue' },
]

interface MembershipEditRowProps {
  row: MembershipAdminRow
  email: string
  columnCount: number
  onClose: () => void
}

// specs/web-memberships.md §1/§7/UI design "Ligne dépliable d'édition"
// (amendement du 2026-09-17) — a SUPPLEMENTARY <tr> at full colSpan,
// inserted between the row concerned and the next one, never a <dialog>:
// this is the export `payment-1`'s own reconciled mise en page, two columns
// side by side ("INFORMATIONS DU JOUEUR" / "HISTORIQUE DES VERSEMENTS").
export function MembershipEditRow({ row, email, columnCount, onClose }: MembershipEditRowProps) {
  const vm = useMembershipEditRowViewModel({ row, onSuccess: onClose })

  return (
    <TableRow className="hover:bg-transparent">
      <TableCell colSpan={columnCount} className="whitespace-normal bg-muted/30 p-4">
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

          {/* UI design — two columns side by side, each min-w-0 (CLAUDE.md
              §6): the left column itself stacks a côte-à-côte pair further
              down, so this outer grid needs the same protection at the
              floor width RequireDesktopViewport allows. */}
          <div className="grid grid-cols-2 gap-6">
            <div className="flex min-w-0 flex-col gap-3">
              <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Informations du joueur</h4>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Nom</Label>
                {/* §2.10 — read from the account, never written from this
                    screen. */}
                <Input value={row.userFullName} disabled className="h-11 rounded-xl" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">E-mail</Label>
                <Input value={email} disabled className="h-11 rounded-xl" />
              </div>

              <div className="flex flex-col gap-1.5">
                <Label htmlFor={`edit-licence-${row.membership.id}`} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Licence
                </Label>
                {/* §2.1/AC-WM-15 — optional, empty is a normal case. */}
                <Input
                  id={`edit-licence-${row.membership.id}`}
                  disabled={vm.isSubmitting}
                  value={vm.values.licenceNumber}
                  onChange={(event) => vm.setLicenceNumber(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              {/* UI design — "Valide jusqu'au" and status côte à côte, exactly
                  as export payment-1 shows them: min-w-0 mandatory on EACH
                  cell (CLAUDE.md §6, the <input type="date"> piège). */}
              <div className="grid grid-cols-2 gap-3">
                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label
                    htmlFor={`edit-valid-until-${row.membership.id}`}
                    className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    Valide jusqu&rsquo;au
                  </Label>
                  <Input
                    id={`edit-valid-until-${row.membership.id}`}
                    type="date"
                    required
                    disabled={vm.isSubmitting}
                    value={vm.values.validUntil}
                    onChange={(event) => vm.setValidUntil(event.target.value)}
                    className="h-11 rounded-xl"
                  />
                </div>

                <div className="flex min-w-0 flex-col gap-1.5">
                  <Label
                    htmlFor={`edit-status-${row.membership.id}`}
                    className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                  >
                    Statut
                  </Label>
                  <Select value={vm.values.status} onValueChange={(value) => vm.setStatus(value as MembershipStatus)} disabled={vm.isSubmitting}>
                    <SelectTrigger id={`edit-status-${row.membership.id}`} className="h-11 rounded-xl">
                      <SelectValue />
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
              </div>

              <div className="flex flex-col gap-1.5">
                <Label
                  htmlFor={`edit-amount-due-${row.membership.id}`}
                  className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
                >
                  Cotisation totale (€)
                </Label>
                {/* §2.1/AC-WM-34 — the field the create dialog deliberately
                    does NOT carry; only this edit row writes it. */}
                <div className="relative">
                  <Input
                    id={`edit-amount-due-${row.membership.id}`}
                    type="number"
                    step="0.01"
                    min="0"
                    inputMode="decimal"
                    disabled={vm.isSubmitting}
                    value={vm.values.amountDueEuros}
                    onChange={(event) => vm.setAmountDueEuros(event.target.value)}
                    className="h-11 rounded-xl pr-8"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">€</span>
                </div>
              </div>
            </div>

            <div className="flex min-w-0 flex-col gap-3">
              <h4 className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">Historique des versements</h4>
              <PaymentHistoryList isLoading={vm.isLoadingHistory} payments={vm.payments} />
            </div>
          </div>

          <div className="flex justify-end gap-3">
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
          </div>
        </form>
      </TableCell>
    </TableRow>
  )
}
