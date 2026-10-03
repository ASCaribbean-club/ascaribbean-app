import type { NewsConsoleStatus } from '@domain/policies/news-management-rules'

// Mobile labels/colours of the console status badge (PO-DH-16): "Publiée" on
// mobile where the web console says "Active" (Q-UI-04) — the web
// NewsStatusBadge is left untouched (AC-DH-30). Always text + colour.
export const NEWS_CONSOLE_STATUS_BADGE: Record<NewsConsoleStatus, { label: string; className: string }> = {
  draft: { label: 'Brouillon', className: 'border-border bg-muted text-muted-foreground' },
  published: { label: 'Publiée', className: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text' },
  expired: { label: 'Expirée', className: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text' },
}
