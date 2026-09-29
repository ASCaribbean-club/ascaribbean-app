import type { Icon } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

interface MenuNavCardProps {
  icon: Icon
  title: string
  subtitle: string
  to: string
}

// specs/player-stats.md UI design §2 (PO-PS-01/AC-PS-15, résolu 2026-09-28)
// — active variant of DisabledMenuCard: same shape (icon in a decorative
// circle, bold title, neutral subtitle, `min-h-16 min-w-0`), full opacity,
// a real interactive element this time. No chevron/external-link affordance
// added — nothing else in the "Suivi de l'équipe" grid has one, and this is
// an internal route, not an external link (unlike ExternalLinkRow).
// Identical for all 8 roles — no `can()` check here (AC-PS-15, §2 of the
// spec: the two new RBAC actions are person-scoped, not role-gated
// rendering of this card).
export function MenuNavCard({ icon: IconComponent, title, subtitle, to }: MenuNavCardProps) {
  return (
    <Link
      to={to}
      className="flex min-h-16 min-w-0 flex-col items-start gap-3 rounded-3xl border border-white/10 bg-white/5 px-4.5 py-4"
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10">
        <IconComponent className="size-5.5 text-white" />
      </span>
      <span className="flex min-w-0 flex-col gap-0.5 text-left">
        <span className="truncate text-[15px] font-bold text-white">{title}</span>
        <span className="truncate text-[12.5px] text-white/60">{subtitle}</span>
      </span>
    </Link>
  )
}
