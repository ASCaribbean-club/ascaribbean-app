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
import { toDateInputValue } from '@presentation/shared/formatters/date-input'
import type { MembershipAdminRow } from '../useBackofficeMembershipsViewModel'
import { useRecordPaymentDialogViewModel } from '../useRecordPaymentDialogViewModel'
import { MembershipCotisationSummary } from './MembershipCotisationSummary'
import { PaymentHistoryList } from './PaymentHistoryList'

interface RecordPaymentDialogProps {
  target: MembershipAdminRow | null
  onClose: () => void
}

// specs/web-memberships.md UI design, "Nouveau composant — RecordPaymentDialog"
// (réconcilié, amendement du 2026-09-17) — the dialog's own trigger ("+
// Paiement") is still unillustrated, but its CONTENT is now illustrated by
// the export `payment`: two fields (MONTANT (€), DATE DU VERSEMENT — not
// "DATE DE PAIEMENT", corrected below) and the mockup's own italic copy.
// Composed from NewsFormDialog's own dialog/form/footer shape, plus
// PaymentHistoryList (§2.2, "chaque paiement est un fait daté et cumulatif
// de même nature"), now SHARED with MembershipEditRow's own history column
// rather than duplicated.
export function RecordPaymentDialog({ target, onClose }: RecordPaymentDialogProps) {
  if (!target) return null

  return <RecordPaymentDialogContent key={target.membership.id} target={target} onClose={onClose} />
}

function RecordPaymentDialogContent({ target, onClose }: { target: MembershipAdminRow; onClose: () => void }) {
  const vm = useRecordPaymentDialogViewModel({ target })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Enregistrer un paiement</DialogTitle>
        </DialogHeader>

        <div className="flex flex-col gap-4">
          {/* UI design point 2 — same text/predicate as the row's own
              COTISATION cell (AC-WM-13), never a second calculation. */}
          <div className="text-sm text-muted-foreground">
            {target.userFullName} · saison {target.seasonLabel}
            {!vm.isLoadingHistory && (
              <div className="mt-1">
                <MembershipCotisationSummary paidCents={vm.paidCents} amountDueCents={target.membership.amountDueCents} status={vm.paymentStatus} />
              </div>
            )}
          </div>

          {/* UI design point 3 — history list, most-recent-first, no
              modify/delete control anywhere on a row (§2.2, append-only),
              shared verbatim with MembershipEditRow's own column (amendement
              du 2026-09-17). */}
          <div>
            <Label className="mb-1.5 block text-xs font-semibold tracking-wider text-muted-foreground uppercase">
              Historique des versements
            </Label>
            <PaymentHistoryList isLoading={vm.isLoadingHistory} payments={vm.payments} />
          </div>

          <div className="border-t border-border pt-4">
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
                <Label htmlFor="payment-amount" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Montant
                </Label>
                <div className="relative">
                  <Input
                    id="payment-amount"
                    type="number"
                    step="0.01"
                    min="0.01"
                    inputMode="decimal"
                    required
                    disabled={vm.isSubmitting}
                    value={vm.amountEuros}
                    onChange={(event) => vm.setAmountEuros(event.target.value)}
                    className="h-11 rounded-xl pr-8"
                  />
                  <span className="pointer-events-none absolute inset-y-0 right-3 flex items-center text-sm text-muted-foreground">€</span>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                {/* UI design (amendement du 2026-09-17) — the mockup's own
                    exact label ("DATE DU VERSEMENT"), corrected from the
                    earlier "DATE DE PAIEMENT". */}
                <Label htmlFor="payment-paid-at" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                  Date du versement
                </Label>
                <Input
                  id="payment-paid-at"
                  type="date"
                  required
                  max={toDateInputValue(new Date())}
                  disabled={vm.isSubmitting}
                  value={vm.paidAt}
                  onChange={(event) => vm.setPaidAt(event.target.value)}
                  className="h-11 rounded-xl"
                />
              </div>

              {/* §1 — the export `payment`'s own italic copy (amendement du
                  2026-09-17), confirming mot pour mot the cumulative,
                  never-overwriting nature of a payment (§2.2) — never
                  remove this to "lighten" the form. */}
              <p className="text-xs text-muted-foreground italic">
                La cotisation peut être versée en plusieurs fois : ce montant s'ajoute aux versements déjà enregistrés.
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
          </div>
        </div>
      </DialogContent>
    </Dialog>
  )
}
