import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import type { FinanceCarrierDialogState } from '../useBackofficeFinanceCarriersViewModel'
import { useFinanceCarrierFormDialogViewModel } from '../useFinanceCarrierFormDialogViewModel'
import { FinanceCarrierKindField } from './FinanceCarrierKindField'

interface FinanceCarrierFormDialogProps {
  dialog: FinanceCarrierDialogState
  onClose: () => void
}

// specs/web-finance-carriers.md UI design — one component, two modes, same
// pattern as TrainingLocationFormDialog: remounted via `key`, renders nothing
// while closed (Radix Dialog gives focus trap and Escape for free).
export function FinanceCarrierFormDialog({ dialog, onClose }: FinanceCarrierFormDialogProps) {
  if (!dialog) return null

  return (
    <FinanceCarrierFormDialogContent key={dialog.mode === 'edit' ? dialog.carrier.id : 'create'} dialog={dialog} onClose={onClose} />
  )
}

const DIALOG_TITLE = { create: 'Ajouter un porteur', edit: 'Modifier le porteur' } as const
const SUBMIT_LABEL = { create: 'Ajouter', edit: 'Enregistrer' } as const
const SUBMITTING_LABEL = { create: 'Ajout…', edit: 'Enregistrement…' } as const

const LABEL_CLASSNAME = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase'
// UI-only sentinel: Radix Select forbids an empty item value (same as RecordPaymentDialog).
const NO_MANAGER = 'none'

function FinanceCarrierFormDialogContent({
  dialog,
  onClose,
}: FinanceCarrierFormDialogProps & { dialog: NonNullable<FinanceCarrierDialogState> }) {
  const vm = useFinanceCarrierFormDialogViewModel({
    mode: dialog.mode,
    carrier: dialog.mode === 'edit' ? dialog.carrier : null,
    onSuccess: onClose,
  })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>{DIALOG_TITLE[dialog.mode]}</DialogTitle>
        </DialogHeader>

        <form
          className="flex flex-col gap-4"
          onSubmit={(event) => {
            event.preventDefault()
            vm.submit()
          }}
        >
          {/* Failure renders on top of the fields, without closing the dialog
              or clearing what was typed. */}
          {vm.errorMessage && (
            <Alert variant="destructive" role="alert">
              <AlertDescription>{vm.errorMessage}</AlertDescription>
            </Alert>
          )}

          {/* Fields stacked full width — no side-by-side pair, so no min-w-0
              needed here (CLAUDE.md §6). */}
          <div className="flex flex-col gap-1.5">
            <Label htmlFor="finance-carrier-label" className={LABEL_CLASSNAME}>
              Libellé
            </Label>
            <Input
              id="finance-carrier-label"
              placeholder="Ex. Compte courant du club"
              required
              maxLength={vm.maxLabelLength}
              disabled={vm.isSubmitting}
              value={vm.values.label}
              onChange={(event) => vm.setLabel(event.target.value)}
              className="h-11 rounded-xl"
            />
            {dialog.mode === 'edit' && (
              <p className="text-xs text-muted-foreground">Le nouveau nom s’appliquera aussi aux dépenses et points passés.</p>
            )}
          </div>

          <FinanceCarrierKindField
            value={vm.values.kind}
            readOnly={vm.kindLabelReadOnly}
            disabled={vm.isSubmitting}
            onChange={vm.setKind}
          />

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="finance-carrier-detail" className={LABEL_CLASSNAME}>
              Détail (facultatif)
            </Label>
            <Input
              id="finance-carrier-detail"
              aria-describedby="finance-carrier-detail-help"
              maxLength={vm.maxDetailLength}
              disabled={vm.isSubmitting}
              value={vm.values.detail}
              onChange={(event) => vm.setDetail(event.target.value)}
              className="h-11 rounded-xl"
            />
            <p id="finance-carrier-detail-help" className="text-xs text-muted-foreground">
              Ne saisissez ni IBAN ni numéro de compte.
            </p>
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="finance-carrier-manager" className={LABEL_CLASSNAME}>
              Responsable (facultatif)
            </Label>
            <Select
              value={vm.values.managerUserId === '' ? NO_MANAGER : vm.values.managerUserId}
              onValueChange={(value) => vm.setManagerUserId(value === NO_MANAGER ? '' : value)}
              disabled={vm.isSubmitting}
            >
              <SelectTrigger id="finance-carrier-manager" aria-describedby="finance-carrier-manager-help" className="h-11 w-full rounded-xl">
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value={NO_MANAGER}>Aucun responsable</SelectItem>
                {vm.managerOptions.map((option) => (
                  <SelectItem key={option.value} value={option.value}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            {vm.managersUnavailable && <p className="text-xs text-muted-foreground">Liste des comptes indisponible.</p>}
            <p id="finance-carrier-manager-help" className="text-xs text-muted-foreground">
              Son nom sera visible du Trésorier et du Dirigeant habilité.
            </p>
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
              {vm.isSubmitting ? SUBMITTING_LABEL[dialog.mode] : SUBMIT_LABEL[dialog.mode]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
