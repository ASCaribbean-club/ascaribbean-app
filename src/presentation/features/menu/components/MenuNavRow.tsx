import type { Icon } from '@tabler/icons-react'
import { IconChevronRight } from '@tabler/icons-react'
import { Link } from 'react-router-dom'

interface MenuNavRowProps {
  icon: Icon
  title: string
  subtitle: string
  to: string
}

// specs/mob-notifications.md UI design §1 — the full-width row layout of
// ExternalLinkRow for an INTERNAL destination (chevron instead of the
// external-link icon). Static, no query, identical for the 8 roles.
export function MenuNavRow({ icon: IconComponent, title, subtitle, to }: MenuNavRowProps) {
  return (
    <Link
      to={to}
      className="flex min-h-16 w-full items-center gap-3.5 rounded-3xl border border-white/10 bg-white/5 px-4.5 py-4"
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10">
        <IconComponent className="size-5.5 text-white" />
      </span>
      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-bold text-white">{title}</span>
        <span className="truncate text-[12.5px] text-white/60">{subtitle}</span>
      </span>
      <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15">
        <IconChevronRight className="size-4 text-white/70" />
      </span>
    </Link>
  )
}
