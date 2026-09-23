interface BackofficePageHeaderProps {
  firstName: string
  // specs/web-dashboard.md §2.7/AC-WD-22 — "Saison {libellé} · {N} sections
  // · club invitation-only", already fully assembled by the ViewModel (this
  // component has zero business logic, CLAUDE.md §6): `null` while the
  // sections count hasn't resolved yet — the line is simply omitted, it
  // never renders broken or with an invented value. This component still
  // has exactly ONE caller (BackofficeOverviewPage) — no other backoffice
  // screen is affected by this prop existing.
  contextLine?: string | null
}

// `[Admin] Web - Dashboard.png`'s header block. Two changes from the
// web-empty-state era (AC-WD-22):
//
// 1. The context line is now rendered when the ViewModel provides one
//    (AC-WE-17 is lifted for THIS screen only, per specs/web-dashboard.md
//    §2.7 — the other 6 backoffice destinations never pass this prop, so
//    AC-WE-17 stays in force everywhere else).
// 2. "Nouvelle section" / "Inviter un utilisateur" are GONE — the mockup no
//    longer shows them, and the action-tile row below this header (§2.3 of
//    the same spec) replaces and exceeds what they used to promise
//    (AC-WD-22).
export function BackofficePageHeader({ firstName, contextLine }: BackofficePageHeaderProps) {
  return (
    <div className="flex flex-col gap-1.5">
      <h1 className="text-2xl font-extrabold tracking-tight text-foreground">{firstName ? `Bonjour, ${firstName}` : 'Bonjour'}</h1>
      {contextLine && <p className="text-sm text-muted-foreground">{contextLine}</p>}
    </div>
  )
}
