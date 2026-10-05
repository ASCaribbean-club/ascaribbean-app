import { describe, expect, it } from 'vitest'
import { parseMobileChangelog } from './parse-changelog'

const SAMPLE = `# Journal

## [0.2.0] — 2026-10-01

### Web
**Administrateur**
- Web only

### Mobile
**Coach**
- Feature A
- Feature B

**Tous**
- Fix C

## [0.1.0] — 2026-09-01

### Web
- Web only
`

describe('parseMobileChangelog', () => {
  it('keeps only mobile sections, grouped by role', () => {
    expect(parseMobileChangelog(SAMPLE)).toEqual([
      {
        version: '0.2.0',
        date: '2026-10-01',
        groups: [
          { role: 'Coach', items: ['Feature A', 'Feature B'] },
          { role: 'Tous', items: ['Fix C'] },
        ],
      },
    ])
  })
})
