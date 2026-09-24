import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Card } from '@presentation/shared/components/ui/card'
import { Checkbox } from '@presentation/shared/components/ui/checkbox'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { PlayerPickerRow } from './PlayerPickerRow'
import { RecordedEventRow } from './RecordedEventRow'

interface MatchResultScorerPickerProps {
  goalsFor: number | null
  attributedCount: number
  scorerCapReached: boolean
  scoreRecorded: boolean
  eligibleScorers: { userId: string; displayName: string }[]
  selectedScorerId: string | null
  onSelectScorer: (userId: string) => void
  isPenaltySelected: boolean
  onToggleIsPenalty: (value: boolean) => void
  canAddGoal: boolean
  isSubmitting: boolean
  error: UiError | null
  onCancel: () => void
  onAdd: () => void
  recordedGoals: { id: string; displayName: string; isPenalty: boolean; isDeleting: boolean }[]
  onDeleteGoal: (eventId: string) => void
}

// specs/match-stats.md UI design §3/§5 — "Carte BUTEURS". The counter "X / N
// buts attribués" is a direct read of AC-MS-05 (`attributedCount`/
// `goalsFor`, both already computed by the ViewModel), never a decorative
// label. The card stays visible even before the score is recorded (AC-MS-15
// is translated as a DISABLED "Ajouter", not the block's disappearance —
// MS-13's own picker never touches `reason`, only `displayName`).
export function MatchResultScorerPicker({
  goalsFor,
  attributedCount,
  scorerCapReached,
  scoreRecorded,
  eligibleScorers,
  selectedScorerId,
  onSelectScorer,
  isPenaltySelected,
  onToggleIsPenalty,
  canAddGoal,
  isSubmitting,
  error,
  onCancel,
  onAdd,
  recordedGoals,
  onDeleteGoal,
}: MatchResultScorerPickerProps) {
  return (
    <Card className="gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4.5">
      <div className="flex items-baseline justify-between">
        <p className="text-[11px] font-extrabold tracking-wider text-white/50 uppercase">Buteurs</p>
        <p className="text-[12.5px] font-bold text-white/70">
          {attributedCount} / {goalsFor ?? '—'} buts attribués
        </p>
      </div>

      {recordedGoals.length > 0 && (
        <ul className="flex flex-col gap-2">
          {recordedGoals.map((goal) => (
            <RecordedEventRow
              key={goal.id}
              name={goal.displayName}
              subtitle={goal.isPenalty ? 'Penalty' : undefined}
              isDeleting={goal.isDeleting}
              onDelete={() => onDeleteGoal(goal.id)}
            />
          ))}
        </ul>
      )}

      {!scoreRecorded && <p className="text-[12.5px] text-white/50">Le score doit être enregistré avant d’ajouter un buteur.</p>}

      <p className="text-[12.5px] text-white/50">Un buteur doit être noté présent pour apparaître dans la liste.</p>

      <label className="flex h-11 w-fit items-center gap-2 rounded-full border border-white/15 bg-white/6 px-4 text-[13px] font-bold text-white">
        <Checkbox
          checked={isPenaltySelected}
          onCheckedChange={(checked) => onToggleIsPenalty(checked === true)}
          disabled={scorerCapReached || !scoreRecorded}
          className="size-4.5"
        />
        Penalty
      </label>

      {eligibleScorers.length === 0 ? (
        <p className="text-[12.5px] text-white/40">Aucun joueur noté présent pour l’instant.</p>
      ) : (
        <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Buteur">
          {eligibleScorers.map((player) => (
            <PlayerPickerRow
              key={player.userId}
              name={player.displayName}
              selected={selectedScorerId === player.userId}
              onSelect={() => onSelectScorer(player.userId)}
            />
          ))}
        </ul>
      )}

      {error && (
        <Alert variant="destructive" data-variant={error.variant}>
          <AlertDescription>{error.message}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-2.5">
        <Button
          type="button"
          variant="outline"
          onClick={onCancel}
          className="h-11 flex-1 rounded-xl border-white/15 bg-white/6 text-[14px] font-extrabold text-white hover:bg-white/10"
        >
          Annuler
        </Button>
        <Button
          type="button"
          onClick={onAdd}
          disabled={!canAddGoal || isSubmitting}
          className="h-11 flex-1 rounded-xl bg-coach-green text-[14px] font-extrabold text-white hover:bg-coach-green/90 disabled:opacity-40"
        >
          Ajouter
        </Button>
      </div>
    </Card>
  )
}
