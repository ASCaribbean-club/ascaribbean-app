import { IconLoader2, IconUserPlus } from '@tabler/icons-react'
import { InitialsAvatar } from '@presentation/shared/components/InitialsAvatar'
import { Button } from '@presentation/shared/components/ui/button'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import type { AddAttendeeViewModel } from './useAddAttendeeViewModel'

interface AddAttendeePanelProps {
  attendee: AddAttendeeViewModel
}

// specs/convocation-player-selection.md §4 — "Convoquer un joueur": the button
// under the Effectif list (coach only: not even mounted otherwise) and the
// panel it opens. One player per tap, no validation step. Every state is a
// boolean the ViewModel computed: loading, load error, nobody left to add, cap
// reached, write in flight (one row at a time), refusal message.
export function AddAttendeePanel({ attendee }: AddAttendeePanelProps) {
  if (!attendee.canAdd) return null

  return (
    <>
      <Button
        type="button"
        variant="outline"
        onClick={attendee.open}
        className="h-11 w-full gap-2 rounded-full border-white/20 bg-transparent text-white hover:bg-white/10 hover:text-white"
      >
        <IconUserPlus className="size-5" aria-hidden />
        Convoquer un joueur
      </Button>

      <Dialog open={attendee.isOpen} onOpenChange={(next) => !next && attendee.close()}>
        <DialogContent className="border-white/10 bg-coach-bg text-white sm:max-w-md">
          <DialogHeader>
            <DialogTitle className="text-white">Convoquer un joueur</DialogTitle>
            <DialogDescription className="text-white/60">
              {attendee.counterLabel ?? 'Choisissez un joueur de l’équipe à ajouter à la convocation.'}
            </DialogDescription>
          </DialogHeader>

          {attendee.capReached ? (
            <p className="text-sm text-white/70">{attendee.capReachedMessage}</p>
          ) : attendee.isLoading ? (
            <ul className="m-0 flex list-none flex-col gap-2 p-0" aria-busy="true">
              {[0, 1, 2].map((index) => (
                <li key={index}>
                  <Skeleton className="h-11 rounded-2xl bg-white/8" />
                </li>
              ))}
            </ul>
          ) : attendee.hasLoadError ? (
            <div className="flex flex-col items-start gap-2">
              <p role="alert" className="text-sm font-semibold text-coach-red-text">
                Impossible de charger les joueurs.
              </p>
              <Button type="button" variant="outline" onClick={attendee.retryLoad} className="h-11 border-white/20 text-white">
                Réessayer
              </Button>
            </div>
          ) : attendee.hasNoPlayerToAdd ? (
            <p className="text-sm text-white/70">Tous les joueurs de l’équipe sont déjà convoqués.</p>
          ) : (
            <ul className="m-0 flex max-h-64 list-none flex-col gap-2 overflow-y-auto p-0">
              {attendee.players.map((player) => (
                <li key={player.userId}>
                  <button
                    type="button"
                    onClick={() => attendee.onPick(player.userId)}
                    disabled={attendee.pendingUserId !== null}
                    className="flex min-h-11 w-full items-center gap-3 rounded-2xl border border-white/10 bg-white/5 px-4 py-2 text-left transition-colors hover:bg-white/10 disabled:opacity-60"
                  >
                    <InitialsAvatar name={player.displayName} />
                    <span className="min-w-0 flex-1 truncate text-sm font-semibold text-white">{player.displayName}</span>
                    {attendee.pendingUserId === player.userId && <IconLoader2 className="size-4 animate-spin" aria-label="Ajout en cours" />}
                  </button>
                </li>
              ))}
            </ul>
          )}

          {attendee.errorMessage && (
            <p role="alert" className="text-sm font-semibold text-coach-red-text">
              {attendee.errorMessage}
            </p>
          )}
        </DialogContent>
      </Dialog>
    </>
  )
}
