import type { LegacyRule } from '@domain/entities/legacy'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogFooter, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@presentation/shared/components/ui/select'
import { Textarea } from '@presentation/shared/components/ui/textarea'
import type { PlayerOption } from '../useLegacyPointsViewModel'
import { useAwardPointsDialogViewModel } from '../useAwardPointsDialogViewModel'

interface AwardPointsDialogProps {
  open: boolean
  players: PlayerOption[]
  rules: LegacyRule[]
  onClose: () => void
}

// Remounted per opening (no useEffect reset), same pattern as SeasonFormDialog.
export function AwardPointsDialog({ open, players, rules, onClose }: AwardPointsDialogProps) {
  if (!open) return null
  return <AwardPointsDialogContent players={players} rules={rules} onClose={onClose} />
}

const LABEL = 'text-xs font-semibold tracking-wider text-muted-foreground uppercase'

function AwardPointsDialogContent({ players, rules, onClose }: Omit<AwardPointsDialogProps, 'open'>) {
  const vm = useAwardPointsDialogViewModel({ rules, onSuccess: onClose })

  return (
    <Dialog open onOpenChange={(isOpen) => !isOpen && onClose()}>
      <DialogContent className="sm:max-w-[480px]">
        <DialogHeader>
          <DialogTitle>Attribuer des points</DialogTitle>
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

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="award-player" className={LABEL}>
              Joueur
            </Label>
            <Select value={vm.userId} onValueChange={vm.setUserId} disabled={vm.isSubmitting}>
              <SelectTrigger id="award-player" className="h-11 w-full min-w-0 rounded-xl">
                <SelectValue placeholder="Choisir un joueur" />
              </SelectTrigger>
              <SelectContent>
                {players.map((player) => (
                  <SelectItem key={player.id} value={player.id}>
                    {player.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="award-date" className={LABEL}>
              Date du fait
            </Label>
            <Input
              id="award-date"
              type="date"
              required
              disabled={vm.isSubmitting}
              value={vm.earnedOn}
              onChange={(event) => vm.setEarnedOn(event.target.value)}
              className="h-11 min-w-0 rounded-xl"
            />
            {vm.selectedSeasonRangeLabel && <p className="text-xs text-muted-foreground">{vm.selectedSeasonRangeLabel}</p>}
          </div>

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="award-rule" className={LABEL}>
              Action
            </Label>
            <Select value={vm.ruleId} onValueChange={vm.setRuleId} disabled={vm.isSubmitting}>
              <SelectTrigger id="award-rule" className="h-11 w-full min-w-0 rounded-xl">
                <SelectValue placeholder="Choisir une action" />
              </SelectTrigger>
              <SelectContent>
                {vm.ruleOptions.map((option) => (
                  <SelectItem key={option.id} value={option.id}>
                    {option.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
            <p className="text-xs text-muted-foreground">
              Seules les actions manuelles du référentiel valides à cette date sont proposées.
            </p>
          </div>

          {vm.isCatchup && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="award-season" className={LABEL}>
                Saison
              </Label>
              <Select value={vm.seasonId} onValueChange={vm.setSeasonId} disabled={vm.isSubmitting}>
                <SelectTrigger id="award-season" className="h-11 w-full min-w-0 rounded-xl">
                  <SelectValue placeholder="Choisir une saison" />
                </SelectTrigger>
                <SelectContent>
                  {vm.seasonOptions.map((option) => (
                    <SelectItem key={option.id} value={option.id}>
                      {option.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
              <p className="text-xs text-muted-foreground">La date du fait doit appartenir à cette saison.</p>
            </div>
          )}

          {vm.isVariable && (
            <div className="flex min-w-0 flex-col gap-1.5">
              <Label htmlFor="award-points" className={LABEL}>
                Points ({vm.minPoints} à {vm.maxPoints})
              </Label>
              <Input
                id="award-points"
                type="number"
                min={vm.minPoints}
                max={vm.maxPoints ?? undefined}
                step="1"
                inputMode="numeric"
                required
                disabled={vm.isSubmitting}
                value={vm.variablePoints}
                onChange={(event) => vm.setVariablePoints(event.target.value)}
                className="h-11 min-w-0 rounded-xl"
              />
            </div>
          )}
          {vm.fixedPoints !== null && <p className="text-sm font-semibold text-foreground">Points attribués : {vm.fixedPoints} pts</p>}

          <div className="flex min-w-0 flex-col gap-1.5">
            <Label htmlFor="award-reason" className={LABEL}>
              Motif (obligatoire)
            </Label>
            <Textarea
              id="award-reason"
              required
              disabled={vm.isSubmitting}
              value={vm.reason}
              onChange={(event) => vm.setReason(event.target.value)}
              placeholder={vm.isCatchup ? 'Ex. : saison précédente' : undefined}
              className="min-h-20 min-w-0 rounded-xl"
            />
            <p className="text-xs text-muted-foreground">Visible par le joueur dans son historique.</p>
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
              {vm.isSubmitting ? 'Attribution…' : 'Attribuer'}
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  )
}
