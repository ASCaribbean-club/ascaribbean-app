import changelogMarkdown from '/CHANGELOG.md?raw'
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from '@presentation/shared/components/ui/dialog'
import { parseMobileChangelog } from '../changelog/parse-changelog'

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
        <div className="flex min-h-0 flex-col gap-5 overflow-y-auto pr-1">
          {releases.map((release) => (
            <section key={release.version} className="flex flex-col gap-2">
              <h3 className="text-sm font-semibold">
                Version {release.version} <span className="font-normal text-muted-foreground">· {release.date}</span>
              </h3>
              {release.groups.map((group) => (
                <div key={group.role ?? 'all'} className="flex flex-col gap-1">
                  {group.role && <p className="text-xs font-medium text-muted-foreground">{group.role}</p>}
                  <ul className="list-disc space-y-1 pl-4">
                    {group.items.map((item) => (
                      <li key={item}>{item}</li>
                    ))}
                  </ul>
                </div>
              ))}
            </section>
          ))}
        </div>
      </DialogContent>
    </Dialog>
  )
}
