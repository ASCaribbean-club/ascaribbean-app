import changelogMarkdown from '/CHANGELOG.md?raw'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { ReleaseNotesList } from '@presentation/shared/components/ReleaseNotesList'
import { parseMobileChangelog } from '@presentation/shared/changelog/parse-changelog'

interface ChangelogDialogProps {
  open: boolean
  onOpenChange: (open: boolean) => void
}

const releases = parseMobileChangelog(changelogMarkdown)

// Opened by a double tap on the version line (useMenuViewModel.ts). Static
// content, no query: the changelog is bundled at build time.
export function ChangelogDialog({ open, onOpenChange }: ChangelogDialogProps) {
  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-h-[80svh] grid-rows-[auto_1fr]">
        <DialogHeader>
          <DialogTitle>Changements par version</DialogTitle>
          <DialogDescription>Ce qui a changé à chaque version de l'application.</DialogDescription>
        </DialogHeader>
        <ReleaseNotesList releases={releases} />
      </DialogContent>
    </Dialog>
  )
}
