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
}

// specs/mob-notifications.md UI design §3 — plain Dialog (not AlertDialog):
// it never holds the user back (AC-NT-22). One emoji at most, the title reads
// fine without it (§1bis).
export function WhatsNewDialog({
  open,
  onOpenChange,
  releases,
  currentVersion,
}: WhatsNewDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80svh] grid-rows-[auto_1fr_auto]">
        <DialogHeader>
          <DialogTitle>Du nouveau dans l'appli ✨</DialogTitle>
          <DialogDescription>Voici ce qui change avec la version {currentVersion}.</DialogDescription>
        </DialogHeader>
        <div className="min-h-0 space-y-3 overflow-y-auto">
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
