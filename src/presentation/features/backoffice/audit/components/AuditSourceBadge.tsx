import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

interface AuditSourceBadgeProps {
  source: string
}

// specs/web-audit-logs.md — 2026-09-30 (third addendum), new SOURCE column.
// `Badge` (presentation/shared/components/ui/badge.tsx) exposes no semantic
// success/warning/muted variant (only default/secondary/destructive/
// outline/ghost/link) — same situation MembershipStatusBadge/
// ResponderStatusBadge/StatusBadge already solved: compose `Badge` with this
// codebase's own established color tokens (coach-green/coach-amber, defined
// in presentation/styles/global.css, not raw Tailwind palette colors)
// instead of inventing a new styling convention. Color is always doubled by
// the text label (CLAUDE.md §6, AC-AU-26-style "toute information portée
// par la couleur est doublée d'un libellé textuel").
const SOURCE_LABEL: Record<string, string> = {
  usecase: 'Use case',
  trigger: 'Trigger',
  job: 'Job',
}

// 'usecase' -> "normal/positive" tone (green, an ordinary business-action
// write), 'trigger' -> "warning/attention" tone (amber, an emitter outside
// the application's own write path), 'job' -> "neutral/muted" tone (gray, a
// scheduled service_role write). A source outside AUDIT_SOURCES (retired,
// renamed) falls back to the neutral tone and its own raw value as the
// label — never throws, same "the log outlives the code" reasoning as
// domain/policies/audit-sources.ts.
const SOURCE_CLASSNAME: Record<string, string> = {
  usecase: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
  trigger: 'border-coach-amber/35 bg-coach-amber/15 text-coach-amber',
  job: 'border-border bg-white/5 text-white/80',
}

const FALLBACK_CLASSNAME = 'border-border bg-white/5 text-white/80'

export function AuditSourceBadge({ source }: AuditSourceBadgeProps) {
  const label = SOURCE_LABEL[source] ?? source
  const className = SOURCE_CLASSNAME[source] ?? FALLBACK_CLASSNAME

  return (
    <Badge className={cn('rounded-full border px-2.5 py-1 text-[11px] font-bold whitespace-nowrap', className)}>{label}</Badge>
  )
}
