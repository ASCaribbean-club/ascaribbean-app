import type { Icon } from '@tabler/icons-react'

interface BackofficeEmptyStateProps {
  icon: Icon
  title: string
  description?: string
}

// specs/web-empty-state.md, "Corps de page — état vide": replaces the 4
// counter cards + 2 content blocks from `[Admin] Web - Dashboard-1.png`
// entirely (AC-WE-13 forbids reproducing even one of those numbers as a
// static value). ONE component, parameterised per active nav entry
// (BACKOFFICE_NAV_ITEMS' icon/emptyStateTitle), instead of 5 near-identical
// copies — the spec's own instruction ("pas 5 composants dupliqués").
//
// Deliberately NOT the mobile EmptyState
// (presentation/shared/components/EmptyState.tsx), even though the two look
// similar: that one takes an icon + a single message line, sized for a
// mobile empty list. This screen's mockup-equivalent state additionally
// wants an optional second line (a short explanatory sentence under the
// title) — a shape the mobile component doesn't have, and the spec
// explicitly calls this out as a genuinely new component rather than a
// mobile pattern being reused (no equivalent visual exists on mobile for a
// desktop-only screen's centered empty body).
//
// No loading/error branches here on purpose: AC-WE-12 guarantees this
// screen never queries anything, so there's nothing to be loading or to
// fail — unlike BackofficeLoginPage, which really does call a use case.
export function BackofficeEmptyState({ icon: Icon, title, description }: BackofficeEmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-2 rounded-xl border border-dashed border-border px-6 py-24 text-center">
      <Icon className="size-8 text-muted-foreground" aria-hidden />
      <p className="text-base font-semibold text-foreground">{title}</p>
      {description && <p className="max-w-sm text-sm text-muted-foreground">{description}</p>}
    </div>
  )
}
