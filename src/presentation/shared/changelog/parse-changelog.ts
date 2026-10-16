export interface ChangelogGroup {
  // `null` when the items sit directly under the platform heading, with no role line.
  role: string | null
  items: string[]
}

export interface ChangelogRelease {
  version: string
  date: string
  groups: ChangelogGroup[]
}

// Reads the repo-root CHANGELOG.md (imported as raw text, so the in-app list
// can never drift from the file). Format: `## [x.y.z] — date`, then
// `### Web` / `### Mobile`, then optional `**Role**` lines followed by `- item`.
// This is a mobile-only app: the `### Web` sections (admin console) are skipped.
export function parseMobileChangelog(markdown: string): ChangelogRelease[] {
  const releases: ChangelogRelease[] = []
  let release: ChangelogRelease | null = null
  let group: ChangelogGroup | null = null
  let inMobile = false

  for (const rawLine of markdown.split('\n')) {
    const line = rawLine.trim()

    const releaseMatch = line.match(/^## \[([^\]]+)\]\s*—\s*(.+)$/)
    if (releaseMatch) {
      release = { version: releaseMatch[1], date: releaseMatch[2], groups: [] }
      releases.push(release)
      group = null
      inMobile = false
      continue
    }

    const platformMatch = line.match(/^### (.+)$/)
    if (platformMatch) {
      inMobile = platformMatch[1] === 'Mobile'
      group = null
      continue
    }

    if (!release || !inMobile) continue

    const roleMatch = line.match(/^\*\*(.+)\*\*$/)
    if (roleMatch) {
      group = { role: roleMatch[1], items: [] }
      release.groups.push(group)
      continue
    }

    if (line.startsWith('- ')) {
      if (!group) {
        group = { role: null, items: [] }
        release.groups.push(group)
      }
      group.items.push(line.slice(2))
    }
  }

  return releases.filter((r) => r.groups.length > 0)
}
