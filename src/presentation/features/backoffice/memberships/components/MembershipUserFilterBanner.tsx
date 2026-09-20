import { Button } from '@presentation/shared/components/ui/button'

interface MembershipUserFilterBannerProps {
  accountName: string | null
  onReset: () => void
}

// specs/web-users-membership-column.md §2.3b, specs/web-users.md UI design
// "Sur `/admin/memberships` — indicateur de filtre appliqué (`?user=`)" —
// the FIRST screen state in this backoffice that comes from the URL,
// rendered ONLY when BackofficeMembershipsPage decides the `user` param is
// present (this component itself makes no such decision, CLAUDE.md §4:
// zero business logic in a component beyond a boolean already computed).
// Neutral, non-blocking context — NOT an Alert (no error/warning here) —
// same rounded-xl/border-white/15/bg-white/5 treatment already used
// elsewhere in this backoffice for that register.
export function MembershipUserFilterBanner({ accountName, onReset }: MembershipUserFilterBannerProps) {
  return (
    <div className="flex flex-wrap items-center justify-between gap-3 rounded-xl border border-white/15 bg-white/5 px-4 py-3">
      {/* §2.3b/AC-WU-26 — the account's name, read at execution (never
          hard-coded, CLAUDE.md §9). PO-WU-18, option (a): while the name is
          still loading (or can't be resolved), a generic phrase rather than
          a blank or a raw id. */}
      <p className="text-sm text-foreground">Filtré sur {accountName ? <span className="font-semibold">{accountName}</span> : 'un compte'}</p>
      {/* §2.3b — one-gesture cancel: text alone is a sufficient accessible
          name (no separate aria-label needed), h-11 real touch target. */}
      <Button type="button" variant="ghost" onClick={onReset} className="h-11 rounded-full">
        Réinitialiser
      </Button>
    </div>
  )
}
