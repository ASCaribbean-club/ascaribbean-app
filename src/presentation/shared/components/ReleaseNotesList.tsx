import type { ChangelogRelease } from '@presentation/shared/changelog/parse-changelog'

interface ReleaseNotesListProps {
  releases: ChangelogRelease[]
}

// Extracted from ChangelogDialog (specs/mob-notifications.md UI design §3) so
// the Menu changelog and the post-update "what's new" dialog render the notes
// with the exact same markup. Markup is unchanged from the original dialog.
export function ReleaseNotesList({ releases }: ReleaseNotesListProps) {
  return (
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
  )
}
