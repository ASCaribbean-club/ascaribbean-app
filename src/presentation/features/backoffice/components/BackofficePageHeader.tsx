import { Button } from '@presentation/shared/components/ui/button'

interface BackofficePageHeaderProps {
  firstName: string
}

// `[Admin] Web - Dashboard-1.png`'s header block, with two deliberate
// departures from the mockup:
//
// 1. The context line ("Saison 2025-2026 · 4 sections · club invitation-
//    only") is omitted entirely (AC-WE-17: neither value is available
//    without a query, and AC-WE-12 forbids any query here) — the spec
//    explicitly allows this option over a non-chiffré placeholder line.
// 2. "Nouvelle section" / "Inviter un utilisateur" are rendered but
//    `disabled` (AC-WE-16 explicitly allows omitting them instead — this
//    scaffold keeps them, per the spec's stated preference, "rendus,
//    inertes", so the structure reads as "coming soon" rather than
//    missing). No `onClick` at all, not an empty handler: a disabled
//    button is an honest signal that nothing happens yet.
export function BackofficePageHeader({ firstName }: BackofficePageHeaderProps) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-4">
      <div className="flex flex-col gap-1.5">
        <h1 className="text-2xl font-extrabold tracking-tight text-foreground">
          {firstName ? `Bonjour, ${firstName}` : 'Bonjour'}
        </h1>
      </div>

      <div className="flex items-center gap-2.5">
        <Button variant="outline" disabled className="h-11 rounded-full px-4">
          Nouvelle section
        </Button>
        <Button disabled className="h-11 rounded-full bg-coach-green px-4 text-white hover:bg-coach-green">
          Inviter un utilisateur
        </Button>
      </div>
    </div>
  )
}
