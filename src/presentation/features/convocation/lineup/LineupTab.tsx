import { IconHourglass, IconShirtSport } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { FormationChips } from './FormationChips'
import { LineupHeader } from './LineupHeader'
import { LineupPitch } from './LineupPitch'
import { PlayerActionPanel } from './PlayerActionPanel'
import type { MatchLineupViewModel } from './useMatchLineupViewModel'

interface LineupTabProps {
  lineup: MatchLineupViewModel
}

// specs/coach-match-composition.md UI design §4 — "Composition" tab body.
// Zero business logic: branches on the `status` and booleans the ViewModel
// already computed. Same horizontal margins as the Résultat tab.
export function LineupTab({ lineup }: LineupTabProps) {
  const { status } = lineup

  if (status === 'waiting') {
    // No spinner (UI design §4): it would suggest a request in flight.
    return <EmptyState icon={IconHourglass} message={lineup.waitingMessage ?? ''} />
  }

  if (status === 'loading') {
    return (
      <div className="flex flex-col gap-4" aria-busy>
        <Skeleton className="h-11 w-full rounded-full bg-white/10" />
        <Skeleton className="aspect-4/5 w-full rounded-3xl bg-white/10" />
      </div>
    )
  }

  if (status === 'error') {
    return (
      <div className="flex flex-col gap-3">
        <Alert variant="destructive" role="alert">
          <AlertDescription>Impossible de charger la composition.</AlertDescription>
        </Alert>
        <Button type="button" variant="outline" onClick={lineup.onRetry} className="h-11 rounded-full">
          Réessayer
        </Button>
      </div>
    )
  }

  if (status === 'empty') {
    return (
      <div className="flex flex-col items-center">
        <EmptyState
          icon={IconShirtSport}
          message={lineup.canEdit ? 'Aucune composition pour ce match.' : 'Le coach n’a pas encore composé l’équipe.'}
        />
        {lineup.canEdit && (
          <Button
            type="button"
            variant="outline"
            onClick={lineup.onStartEditing}
            className="h-11 rounded-full border-white/15 bg-white/5 px-5 font-bold text-white hover:bg-white/10 hover:text-white"
          >
            Composer l’équipe
          </Button>
        )}
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-4">
      <LineupHeader
        title={lineup.title}
        action={lineup.canEdit ? (lineup.isEditing ? 'done' : 'edit') : null}
        isSaving={lineup.isSaving}
        onEdit={lineup.onStartEditing}
        onDone={lineup.onDone}
      />

      {lineup.saveError && (
        <Alert variant="destructive" role="alert">
          <AlertDescription>{lineup.saveError}</AlertDescription>
        </Alert>
      )}

      {lineup.isEditing && <FormationChips value={lineup.formation} onChange={lineup.onSelectFormation} />}

      {lineup.bannerText && (
        <p className="rounded-2xl border border-white/10 bg-white/5 px-4 py-3 text-xs text-white/60">{lineup.bannerText}</p>
      )}

      <LineupPitch
        formation={lineup.formation}
        slots={lineup.slots}
        interactive={lineup.isEditing}
        selectedSlotIndex={lineup.selectedSlotIndex}
        showEmptyHints={lineup.canEdit}
        onSelectSlot={lineup.onSelectSlot}
      />

      {lineup.isEditing && lineup.panel && (
        <PlayerActionPanel
          panel={lineup.panel}
          onClose={lineup.onClosePanel}
          onToggleSwap={lineup.onToggleSwap}
          onToggleReplace={lineup.onToggleReplace}
          onPickPlayer={lineup.onPickPlayer}
        />
      )}
    </div>
  )
}
