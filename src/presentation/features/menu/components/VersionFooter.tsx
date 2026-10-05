import { cn } from '@presentation/shared/lib/utils'

interface VersionFooterProps {
  version: string
  onVersionTap: () => void
  className?: string
}

// specs/menu.md UI design §"Ligne de version" / AC-MN-09 — centered muted
// text. A double tap (onVersionTap, timed in useMenuViewModel.ts) opens the
// changelog; it stays a plain-looking line, no visible affordance.
//
// `version` is deliberately just a prop: this component renders whatever
// string it's given and never invents one (see useMenuViewModel.ts).
export function VersionFooter({ version, onVersionTap, className }: VersionFooterProps) {
  return (
    <button
      type="button"
      onClick={onVersionTap}
      className={cn('touch-manipulation text-center text-[12px] text-white/40 select-none', className)}
    >
      AS Caribbean · version {version}
    </button>
  )
}
