import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Textarea } from '@presentation/shared/components/ui/textarea'
import { ToggleGroup, ToggleGroupItem } from '@presentation/shared/components/ui/toggle-group'
import { MAX_MISSION_DESCRIPTION_LENGTH } from '@domain/policies/mission-rules'
import { MISSION_CAPACITY_CHOICES, formatMissionCapacity } from '../mission-template-view'
import type { MissionTemplateDialogState } from '../useBackofficeMissionTemplatesViewModel'
import { useMissionTemplateFormDialogViewModel } from '../useMissionTemplateFormDialogViewModel'

interface MissionTemplateFormDialogProps {
  dialog: MissionTemplateDialogState
  onClose: () => void
}

// specs/web-mission-templates.md UI design — one component, two modes.
// Remounted via `key` per opening; renders nothing while closed. The type is
// never a field: it is recalled in the title only.
export function MissionTemplateFormDialog({ dialog, onClose }: MissionTemplateFormDialogProps) {
  if (!dialog) return null

  return (
    <MissionTemplateFormDialogContent
      key={dialog.mode === 'edit' ? dialog.missionTemplate.id : `create-${dialog.convocationType}`}
      dialog={dialog}
      onClose={onClose}
    />
  )
}

const DIALOG_TITLE = { create: 'Ajouter une mission', edit: 'Modifier la mission' } as const
const SUBMIT_LABEL = { create: 'Ajouter', edit: 'Enregistrer' } as const
const SUBMITTING_LABEL = { create: 'Ajout…', edit: 'Enregistrement…' } as const

const LABEL_CLASSNAME = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase'

function MissionTemplateFormDialogContent({
  dialog,
  onClose,
}: { dialog: NonNullable<MissionTemplateDialogState>; onClose: () => void }) {
  const vm = useMissionTemplateFormDialogViewModel({ dialog, onSuccess: onClose })

  return (
    <Dialog open onOpenChange={(open) => !open && onClose()}>
      <DialogContent className="sm:max-w-md">
        <DialogHeader>
          <DialogTitle>
            {DIALOG_TITLE[vm.mode]} — {vm.typeLabel}
          </DialogTitle>
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
            <Label htmlFor="mission-template-label" className={LABEL_CLASSNAME}>
              Libellé
            </Label>
            <Input
              id="mission-template-label"
              placeholder="Ex. Apporter l'eau"
              required
              autoFocus
              disabled={vm.isSubmitting}
              value={vm.label}
              onChange={(event) => vm.setLabel(event.target.value)}
              className="h-11 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label htmlFor="mission-template-description" className={LABEL_CLASSNAME}>
              Détails (optionnel)
            </Label>
            <Textarea
              id="mission-template-description"
              placeholder="Ex. Prévoir des gourdes pour toute l'équipe"
              maxLength={MAX_MISSION_DESCRIPTION_LENGTH}
              rows={3}
              disabled={vm.isSubmitting}
              value={vm.description}
              onChange={(event) => vm.setDescription(event.target.value)}
              className="min-h-20 rounded-xl"
            />
          </div>

          <div className="flex flex-col gap-1.5">
            <Label id="mission-template-capacity-label" className={LABEL_CLASSNAME}>
              Capacité par défaut
            </Label>
            {/* Closed 1/2/3 choice: the range cannot be violated from the
                screen. Three equal items, each min-w-0 (CLAUDE.md §6). */}
            <ToggleGroup
              type="single"
              value={String(vm.capacity)}
              onValueChange={vm.selectCapacity}
              disabled={vm.isSubmitting}
              aria-labelledby="mission-template-capacity-label"
              spacing={2}
              className="grid w-full grid-cols-3 gap-2"
            >
              {MISSION_CAPACITY_CHOICES.map((choice) => (
                <ToggleGroupItem
                  key={choice}
                  value={String(choice)}
                  className="h-11 min-w-0 rounded-xl border px-2 whitespace-normal data-[state=on]:border-coach-green data-[state=on]:bg-coach-green data-[state=on]:text-white"
                >
                  {formatMissionCapacity(choice)}
                </ToggleGroupItem>
              ))}
            </ToggleGroup>
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
              {vm.isSubmitting ? SUBMITTING_LABEL[vm.mode] : SUBMIT_LABEL[vm.mode]}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
