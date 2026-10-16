import { Button } from '@presentation/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@presentation/shared/components/ui/dialog'

interface NotificationsInfoDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

// specs/mob-notifications.md UI design §2 — texts follow §1bis (short, no
// emoji here). The privacy sentence is PROVISIONAL (PO-NT-12, to validate with
// the data-protection referent before production).
const ENTRIES = [
  {
    title: "Vote de l'homme du match",
    text: "Jusqu'à deux rappels si tu n'as pas encore voté : à l'ouverture du vote (environ 1 h après le coup d'envoi) et 24 h avant sa clôture.",
  },
  {
    title: 'Convocation sans réponse',
    text: 'Un rappel 24 h avant un match ou une réunion, 12 h avant un entraînement, si tu n\'as pas encore répondu.',
  },
  { title: 'Cotisation', text: 'Un rappel quand le trésorier en envoie un.' },
  { title: "Homme du match", text: "L'annonce du ou des lauréats, une fois le vote clos." },
]

export function NotificationsInfoDialog({ open, onOpenChange }: NotificationsInfoDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80svh] grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>Ce que tu peux recevoir</DialogTitle>
          <DialogDescription>Selon tes rôles, tu recevras certaines de ces notifications.</DialogDescription>
        </DialogHeader>
        <div className="flex min-h-0 flex-col gap-4 overflow-y-auto pr-1">
          <ul className="list-disc space-y-3 pl-4">
            {ENTRIES.map((entry) => (
              <li key={entry.title}>
                <span className="font-semibold">{entry.title}</span>
                <span className="block text-sm text-muted-foreground">{entry.text}</span>
              </li>
            ))}
          </ul>
          <p className="text-sm text-muted-foreground">
            Les nouveautés de l'application s'affichent dans l'application, sans notification.
          </p>
          <p className="text-sm text-muted-foreground">
            Elles continuent d'arriver même si tu te déconnectes. Pour les arrêter, désactive-les ici.
          </p>
          <p className="text-sm text-muted-foreground">
            Les notifications passent par le service de notification de ton appareil ou de ton navigateur.
          </p>
        </div>
        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => onOpenChange(false)}>
            Fermer
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
