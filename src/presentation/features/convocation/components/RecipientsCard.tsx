import { IconUsersGroup } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Card } from '@presentation/shared/components/ui/card'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Switch } from '@presentation/shared/components/ui/switch'
import { cn } from '@presentation/shared/lib/utils'
import type { CounterTone, RecipientsViewModel } from '../recipients-selection'
import { PlayerSelectRow } from './PlayerSelectRow'

interface RecipientsCardProps {
  recipients: RecipientsViewModel
}

const COUNTER_TONE_CLASS: Record<CounterTone, string> = {
  ok: 'text-coach-green-text',
  warning: 'text-coach-amber',
  error: 'text-coach-red-text',
}

// DESTINATAIRES block (specs/convocation-player-selection.md UI design §3) —
// interactive for the three convocation types. "Toute l'équipe" is a real
// switch: the whole card is a <label> for it, so the tap target is the card
// (~72px), not the small interrupteur. Switched off, it opens the list of the
// team's players (checkbox rows) and the "Tout désélectionner" link. Every
// decision (counter text and tone, cap, locked switch, which link label) comes
// pre-computed in `recipients` — this component only renders it.
export function RecipientsCard({ recipients }: RecipientsCardProps) {
  if (recipients.status === 'empty') {
    return (
      <section>
        <RecipientsHeader counter={null} />
        <EmptyState icon={IconUsersGroup} message="Aucun joueur dans cette équipe." />
      </section>
    )
  }

  return (
    <section>
      <RecipientsHeader counter={recipients.counter} isLoading={recipients.status === 'loading'} />

      <Card className="border-white/10 bg-white/6 px-0 py-0">
        <label htmlFor="all-team-switch" className="flex cursor-pointer items-center justify-between gap-3 px-4 py-3.5">
          <span className="min-w-0">
            <span className="m-0 block text-[14.5px] font-bold text-white">Toute l’équipe</span>
            <span className="m-0 mt-0.5 block text-[12px] text-white/50">
              {recipients.allTeamLockedMessage ?? recipients.unavailableNotice ?? 'Par défaut pour entraînements et matchs'}
            </span>
          </span>
          <Switch
            id="all-team-switch"
            checked={recipients.isAllTeamActive}
            disabled={recipients.status !== 'ready' || recipients.isAllTeamLocked}
            onCheckedChange={recipients.onToggleAllTeam}
            className="data-checked:bg-coach-green data-unchecked:bg-white/20"
          />
        </label>
      </Card>

      {recipients.status === 'loading' && (
        <ul className="m-0 mt-3 flex list-none flex-col gap-2.5 p-0" aria-busy="true">
          {[0, 1, 2].map((index) => (
            <li key={index}>
              <Skeleton className="h-14 rounded-2xl bg-white/8" />
            </li>
          ))}
        </ul>
      )}

      {recipients.status === 'error' && (
        <div className="mt-3 flex flex-col items-start gap-2">
          <p role="alert" className="text-[12px] font-semibold text-coach-red-text">
            Impossible de charger les joueurs de l’équipe.
          </p>
          <Button type="button" variant="outline" onClick={recipients.onRetry} className="h-11 border-white/20 text-white">
            Réessayer
          </Button>
        </div>
      )}

      {recipients.status === 'ready' && !recipients.isAllTeamActive && (
        <div className="mt-3 flex flex-col gap-2.5">
          <div className="flex items-center justify-between">
            <span className="text-[13px] font-semibold text-white/60">{recipients.playerCountLabel}</span>
            {recipients.bulkActionLabel && (
              <Button
                type="button"
                variant="ghost"
                onClick={recipients.onBulkAction}
                className="h-11 px-2 text-[13px] font-bold text-coach-green-link hover:bg-transparent hover:text-coach-green-link"
              >
                {recipients.bulkActionLabel}
              </Button>
            )}
          </div>

          {recipients.unavailableNotice && <p className="m-0 text-[12px] font-semibold text-coach-amber">{recipients.unavailableNotice}</p>}

          <ul className="m-0 flex list-none flex-col gap-2.5 p-0">
            {recipients.players.map((player) => (
              <PlayerSelectRow
                key={player.userId}
                name={player.displayName}
                selected={player.selected}
                unavailableLabel={player.unavailableLabel}
                onToggle={() => recipients.onTogglePlayer(player.userId)}
              />
            ))}
          </ul>

          {recipients.blockingMessage && (
            <Alert variant="destructive" role="alert" className="border-coach-red/40 bg-coach-red/10">
              <AlertDescription className="text-coach-red-text">{recipients.blockingMessage}</AlertDescription>
            </Alert>
          )}
        </div>
      )}
    </section>
  )
}

function RecipientsHeader({ counter, isLoading = false }: { counter: RecipientsViewModel['counter']; isLoading?: boolean }) {
  return (
    <div className="mb-2.5 flex items-baseline justify-between">
      <h2 className="text-[11.5px] font-extrabold tracking-wider text-white/50 uppercase">DESTINATAIRES</h2>
      {isLoading ? (
        <Skeleton className="h-4 w-20 bg-white/8" />
      ) : (
        counter && (
          <span aria-live="polite" className={cn('text-[13px] font-bold', COUNTER_TONE_CLASS[counter.tone])}>
            {counter.text}
          </span>
        )
      )}
    </div>
  )
}
