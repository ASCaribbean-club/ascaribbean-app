import { IconBell } from '@tabler/icons-react'
import type { ActivationAlertVariant } from '@domain/policies/push-notification-onboarding'
import { Alert, AlertDescription, AlertTitle } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from '@presentation/shared/components/ui/dialog'
import { ReleaseNotesList } from '@presentation/shared/components/ReleaseNotesList'
import type { ChangelogRelease } from '@presentation/shared/changelog/parse-changelog'

interface WhatsNewDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
  releases: ChangelogRelease[]
  currentVersion: string
  // null = no alert (anything but the launch version's window, AC-NT-40).
  activationAlertVariant: ActivationAlertVariant | null
  onActivationAlertAction: () => void
}

// specs/mob-notifications.md UI design §3 — two wordings, picked by the ViewModel.
const ALERT_TEXTS: Record<ActivationAlertVariant, { description: string; action: string }> = {
  'open-settings': {
    description:
      "Pour ne rien rater de tes convocations et du vote de l'homme du match, active les notifications dans les paramètres.",
    action: 'Ouvrir les paramètres',
  },
  'how-to': {
    description: "Sur cet appareil, une petite étape est nécessaire. On t'explique tout dans les paramètres.",
    action: 'Voir comment faire',
  },
}

// specs/mob-notifications.md UI design §3 — plain Dialog (not AlertDialog):
// it never holds the user back (AC-NT-22). One emoji at most, the title reads
// fine without it (§1bis).
export function WhatsNewDialog({
  open,
  onOpenChange,
  releases,
  currentVersion,
  activationAlertVariant,
  onActivationAlertAction,
}: WhatsNewDialogProps) {
  const alertTexts = activationAlertVariant ? ALERT_TEXTS[activationAlertVariant] : null
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80svh] grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>Du nouveau dans l'appli{alertTexts ? '' : ' ✨'}</DialogTitle>
          <DialogDescription>Voici ce qui change avec la version {currentVersion}.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto">
          {alertTexts && (
            <Alert>
              <IconBell />
              <AlertTitle>Active tes notifications 🔔</AlertTitle>
              <AlertDescription className="min-w-0">
                <p>{alertTexts.description}</p>
                <Button variant="outline" className="mt-2 h-11 w-full" onClick={onActivationAlertAction}>
                  {alertTexts.action}
                </Button>
              </AlertDescription>
            </Alert>
          )}
          <ReleaseNotesList releases={releases} />
        </div>
        <DialogFooter>
          <Button className="h-11 w-full" onClick={() => onOpenChange(false)}>
            C'est noté
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  )
}
