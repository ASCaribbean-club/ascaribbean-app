import { cn } from '@presentation/shared/lib/utils'

interface VersionFooterProps {
  version: string
  className?: string
}

// specs/menu.md UI design §"Ligne de version" / AC-MN-09 — plain centered
// text, non-interactive (no button/link wrapper), using the same muted
// secondary-text tone already used elsewhere in the app for de-emphasized
// copy (DocumentsSection/RosterRow's own text-white/50-60 range).
//
// `version` is deliberately just a prop: this component renders whatever
// string it's given and never invents one. Sourcing the real value (build
// metadata, not a hardcoded string — AC-MN-09 is explicit that the
// mockup's "2.4.1" is mockup copy, not a real version of this repo) is
// useMenuViewModel.ts's TODO, not this component's concern.
export function VersionFooter({ version, className }: VersionFooterProps) {
  return <p className={cn('text-center text-[12px] text-white/40', className)}>AS Caribbean · version {version}</p>
}
