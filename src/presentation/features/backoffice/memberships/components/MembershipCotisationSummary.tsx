import type { MembershipPaymentStatus } from '@domain/rules/membership-payment-rules'
import { formatEuros } from '@presentation/shared/formatters/currency'
import { cn } from '@presentation/shared/lib/utils'

interface MembershipCotisationSummaryProps {
  paidCents: number
  amountDueCents: number | null
  // AC-WM-12/AC-WM-13 — the ALREADY-COMPUTED result of
  // membershipPaymentStatus(paidCents, amountDueCents), passed in rather
  // than recomputed here: this component never calls the predicate itself,
  // it only renders what the ViewModel already decided (same discipline as
  // SeasonTable/SeasonStatusBadge and MembershipStatusBadge for `status`).
  status: MembershipPaymentStatus
}

// specs/web-memberships.md UI design, "Colonne COTISATION — rendu par état" —
// shared between MembershipTable's own column cell and RecordPaymentDialog's
// context line (§"reprend le même texte que la cellule COTISATION... pas un
// second calcul inline"), so both consume the exact same rendering, not just
// the same predicate.
export function MembershipCotisationSummary({ paidCents, amountDueCents, status }: MembershipCotisationSummaryProps) {
  // PO-WM-02 (still open — amountDueCents itself is no longer blocked,
  // PO-WM-01 was resolved 2026-09-17) — the amount-due-unknown safe
  // default: neutral text, no color, no bar (never a 4th color, never a
  // division by zero).
  if (status === 'undefined') {
    return <span className="text-sm text-muted-foreground">Cotisation non définie</span>
  }

  // amountDueCents is guaranteed non-null and > 0 here — membershipPaymentStatus
  // only ever returns 'undefined' otherwise (see its own doc comment).
  const dueCents = amountDueCents as number
  // PO-WM-02 — over-perception (paidCents > dueCents) stays "paid"/vert; the
  // BAR is capped visually at 100%, the TEXT is never capped (a trop-perçu
  // must stay visible as a real number, not silently rounded down to the
  // due amount).
  const ratio = Math.min(paidCents / dueCents, 1)

  const colorClassName = {
    unpaid: 'text-destructive',
    partial: 'text-coach-amber',
    paid: 'text-green-400',
  }[status]

  const barClassName = {
    unpaid: 'bg-destructive',
    partial: 'bg-coach-amber',
    paid: 'bg-green-400',
  }[status]

  return (
    <div className="flex flex-col gap-1">
      {/* AC-WM-33 — the text ALWAYS carries the information; the bar below
          is decorative only, never the sole signal. */}
      <span className={cn('text-sm font-semibold whitespace-nowrap', colorClassName)}>
        {formatEuros(paidCents)} / {formatEuros(dueCents)}
      </span>
      <div className="h-1.5 w-24 overflow-hidden rounded-full bg-white/10" aria-hidden>
        <div className={cn('h-full rounded-full', barClassName)} style={{ width: `${ratio * 100}%` }} />
      </div>
    </div>
  )
}
