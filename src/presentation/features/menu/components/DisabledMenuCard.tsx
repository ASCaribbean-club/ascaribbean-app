import type { Icon } from '@tabler/icons-react'

interface DisabledMenuCardProps {
  icon: Icon
  title: string
  subtitle: string
  layout?: 'grid' | 'row'
}

// specs/menu.md addendum (2026-09-04), points 2 and 3 — developer decision
// to render Statistiques/Classement/Règlement du club as visible-but-disabled
// cards instead of omitting them (overrides §1 rule 1's default "absence,
// never grisé" for these three specifically; that default rule still stands
// for anything permission-gated, per §2 — these are gated by missing
// module/data/storage, not by role).
//
// `layout="grid"` (default): vertical card for the 2-column "Suivi de
// l'équipe" grid. `layout="row"`: horizontal, matching ExternalLinkRow's
// shape so a disabled entry (Règlement du club) sits visually consistent
// inside a vertical list of otherwise-functional external links.
//
// Plain non-interactive `<div>`, not a `<button disabled>`: there is no
// click handler to disable, this never was and isn't becoming a control.
// `aria-disabled` documents the intent for assistive tech without implying
// a native disabled form control.
export function DisabledMenuCard({ icon: IconComponent, title, subtitle, layout = 'grid' }: DisabledMenuCardProps) {
  return (
    <div
      aria-disabled="true"
      className={
        layout === 'row'
          ? 'flex min-h-16 min-w-0 items-center gap-3.5 rounded-3xl border border-white/5 bg-white/[0.02] px-4.5 py-4 opacity-40'
          : 'flex min-h-16 min-w-0 flex-col items-start gap-3 rounded-3xl border border-white/5 bg-white/[0.02] px-4.5 py-4 opacity-40'
      }
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10">
        <IconComponent className="size-5.5 text-white" />
      </span>
      <span className={layout === 'row' ? 'flex min-w-0 flex-1 flex-col gap-0.5 text-left' : 'flex min-w-0 flex-col gap-0.5 text-left'}>
        <span className="truncate text-[15px] font-bold text-white">{title}</span>
        <span className="truncate text-[12.5px] text-white/60">{subtitle}</span>
      </span>
    </div>
  )
}
