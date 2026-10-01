import { useEffect, useRef } from 'react'
import { IconX } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { cn } from '@presentation/shared/lib/utils'
import { CandidateList } from './CandidateList'
import type { MatchLineupViewModel } from './useMatchLineupViewModel'

interface PlayerActionPanelProps {
  panel: NonNullable<MatchLineupViewModel['panel']>
  onClose: () => void
  onToggleSwap: () => void
  onToggleReplace: () => void
  onPickPlayer: (userId: string) => void
}

// specs/coach-match-composition.md UI design §3/§4/§7 (mockups C1, C3, C4) —
// sits BELOW the pitch, in the flow (no bottom sheet), only while a token is
// selected. Repeats the name and number as text so the selection is not
// colour-only (AC-MC-19). Scrolled into view on mount: the sticky header
// leaves little height and the panel is under the pitch (Q-UI-6).
export function PlayerActionPanel({ panel, onClose, onToggleSwap, onToggleReplace, onPickPlayer }: PlayerActionPanelProps) {
  const ref = useRef<HTMLDivElement>(null)
  useEffect(() => {
    ref.current?.scrollIntoView?.({ block: 'nearest', behavior: 'smooth' })
  }, [panel.slotIndex])

  const title = panel.isEmptySlot ? `Poste ${panel.number} libre` : `${panel.displayName} — poste ${panel.number}`

  return (
    <div ref={ref} className="flex flex-col gap-3 rounded-3xl border border-white/10 bg-white/5 p-4">
      <div className="flex items-center gap-3">
        <p className="min-w-0 flex-1 truncate text-sm font-bold text-white">{title}</p>
        <Button
          type="button"
          variant="ghost"
          aria-label="Fermer"
          onClick={onClose}
          className="size-11 shrink-0 rounded-full text-white hover:bg-white/10 hover:text-white"
        >
          <IconX className="size-5" aria-hidden />
        </Button>
      </div>

      {panel.isEmptySlot ? (
        <CandidateList label="Choisir un joueur disponible" candidates={panel.availablePlayers} onPick={onPickPlayer} />
      ) : (
        <>
          <div className="grid grid-cols-2 gap-2">
            <Button
              type="button"
              variant="outline"
              aria-pressed={panel.mode === 'swap'}
              onClick={onToggleSwap}
              className={cn(
                'h-auto min-h-11 min-w-0 rounded-2xl border-white/15 bg-white/5 whitespace-normal text-white hover:bg-white/10 hover:text-white',
                panel.mode === 'swap' && 'border-coach-green bg-coach-green/20',
              )}
            >
              Changer de position
            </Button>
            <Button
              type="button"
              variant="outline"
              aria-expanded={panel.mode === 'replace'}
              onClick={onToggleReplace}
              className={cn(
                'h-auto min-h-11 min-w-0 rounded-2xl border-white/15 bg-white/5 whitespace-normal text-white hover:bg-white/10 hover:text-white',
                panel.mode === 'replace' && 'border-coach-green bg-coach-green/20',
              )}
            >
              Remplacer
            </Button>
          </div>

          {panel.mode === 'swap' && (
            <p className="text-sm font-semibold text-coach-green-text">Touchez un autre joueur pour échanger les positions.</p>
          )}
          {panel.mode === 'replace' && (
            <CandidateList label="Choisir un remplaçant disponible" candidates={panel.availablePlayers} onPick={onPickPlayer} />
          )}
        </>
      )}
    </div>
  )
}
