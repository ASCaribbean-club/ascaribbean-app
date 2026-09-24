import type { MatchEventType } from '@domain/entities/match-event'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Card } from '@presentation/shared/components/ui/card'
import { SegmentedToggle } from '@presentation/shared/components/SegmentedToggle'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { PlayerPickerRow } from './PlayerPickerRow'
import { RecordedEventRow } from './RecordedEventRow'

interface MatchResultCardPickerProps {
  eligiblePlayers: { userId: string; displayName: string }[]
  selectedCardPlayerId: string | null
  onSelectCardPlayer: (userId: string) => void
  selectedCardType: Extract<MatchEventType, 'yellow_card' | 'red_card'>
  onSelectCardType: (type: Extract<MatchEventType, 'yellow_card' | 'red_card'>) => void
  canAddCard: boolean
  isSubmitting: boolean
  error: UiError | null
  onCancel: () => void
  onAdd: () => void
  recordedCards: { id: string; displayName: string; cardType: 'yellow_card' | 'red_card'; isDeleting: boolean }[]
  onDeleteCard: (eventId: string) => void
}

// specs/match-stats.md UI design §3/§5 — "Carte CARTONS", Coach/Staff only
// (`match_staff_events:view`, AC-MS-09 — this component is only ever
// mounted for the coach variant, never rendered-then-hidden for a player).
// No plafond/counter here — unlike BUTEURS, there is no cap on cards.
export function MatchResultCardPicker({
  eligiblePlayers,
  selectedCardPlayerId,
  onSelectCardPlayer,
  selectedCardType,
  onSelectCardType,
  canAddCard,
  isSubmitting,
  error,
  onCancel,
  onAdd,
  recordedCards,
  onDeleteCard,
}: MatchResultCardPickerProps) {
  return (
    <Card className="gap-3.5 rounded-2xl border border-white/10 bg-white/5 p-4.5">
      <p className="text-[11px] font-extrabold tracking-wider text-white/50 uppercase">Cartons</p>

      {recordedCards.length > 0 && (
        <ul className="flex flex-col gap-2">
          {recordedCards.map((card) => (
            <RecordedEventRow
              key={card.id}
              name={card.displayName}
              subtitle={card.cardType === 'yellow_card' ? 'Jaune' : 'Rouge'}
              isDeleting={card.isDeleting}
              onDelete={() => onDeleteCard(card.id)}
            />
          ))}
        </ul>
      )}

      <SegmentedToggle
        ariaLabel="Type de carton"
        value={selectedCardType === 'yellow_card'}
        onChange={(isYellow) => onSelectCardType(isYellow ? 'yellow_card' : 'red_card')}
        trueLabel="Jaune"
        falseLabel="Rouge"
        trueColor="coach-amber"
        falseColor="coach-red"
      />

      {eligiblePlayers.length === 0 ? (
        <p className="text-[12.5px] text-white/40">Aucun joueur noté présent pour l’instant.</p>
      ) : (
        <ul className="flex flex-col gap-2" role="radiogroup" aria-label="Joueur concerné">
          {eligiblePlayers.map((player) => (
            <PlayerPickerRow
              key={player.userId}
              name={player.displayName}
              selected={selectedCardPlayerId === player.userId}
              onSelect={() => onSelectCardPlayer(player.userId)}
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
          disabled={!canAddCard || isSubmitting}
          className="h-11 flex-1 rounded-xl bg-coach-green text-[14px] font-extrabold text-white hover:bg-coach-green/90 disabled:opacity-40"
        >
          Ajouter
        </Button>
      </div>
    </Card>
  )
}
