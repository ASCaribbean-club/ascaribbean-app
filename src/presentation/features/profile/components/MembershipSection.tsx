import type { Membership } from '@domain/entities/membership'
import { MembershipStatusBadge } from './MembershipStatusBadge'

interface MembershipSectionProps {
  membership: Membership | null
  seasonLabel: string | null
  loading: boolean
  // Distinguishes a real fetch failure from the legitimate "no season" /
  // "not registered" empty states below — those also leave membership/
  // seasonLabel at their empty values, so this flag is the only way to tell
  // them apart (useProfileViewModel's own comment on membershipError).
  error: boolean
}

// specs/profile-page.md §7 addendum (2026-09-04, resolves PO-PR-06) — new
// block placed after the role block, per that addendum's own "nouveau bloc
// « Adhésion » à la suite du bloc rôles". Section header always renders
// (same "always-present section, only its content branches" convention as
// DocumentsSection, AC-PR-14's reasoning applied here too) — "Adhésion" is
// expected content for any account, unlike the role block which can be
// entirely absent (AC-PR-08).
//
// `validUntil` is rendered verbatim as a date, never a financial figure
// (Membership carries no amount/échéancier field at all) — AC-PR-10 stays
// intact, same note already left on GetProfileMembershipUseCase.
// Parses the `YYYY-MM-DD` date-only column as local Y/M/D components, not
// `new Date(iso)` — that parses as UTC midnight and would display the
// previous day for any negative UTC offset (e.g. Martinique/Guadeloupe,
// UTC-4), same reasoning as toDateInputValue's own comment.
function formatValidUntil(iso: string): string {
  const [year, month, day] = iso.split('-').map(Number)
  return new Date(year, month - 1, day).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric' })
}

export function MembershipSection({ membership, seasonLabel, loading, error }: MembershipSectionProps) {
  return (
    <section className="flex flex-col gap-2.5 px-5.5">
      <h2 className="text-[11px] font-semibold tracking-wide text-white/50 uppercase">Adhésion</h2>

      {loading ? (
        // No Skeleton primitive vendored (same call already made in
        // DocumentsSection) — plain loading text is enough for AC-PR-16.
        <p className="text-[13px] text-white/50">Chargement…</p>
      ) : error ? (
        <p className="text-[13px] text-white/50">Impossible de charger les informations d'adhésion.</p>
      ) : !seasonLabel ? (
        // GetProfileMembershipUseCase returns a null seasonLabel when there's
        // no current season (e.g. summer gap between two seasons) — a valid
        // state, not an error, so this is an explicit neutral row rather than
        // a season row with nothing to show.
        <p className="text-[13px] text-white/50">Aucune saison en cours</p>
      ) : !membership ? (
        // Member has no `memberships` row for the current season yet (not
        // re-registered) — also valid, per GetProfileMembershipUseCase's own
        // "member not yet registered" comment. Explicit row, not a silently
        // missing section (same AC-PR-14 reasoning as the empty-documents case).
        <p className="text-[13px] text-white/50">Non inscrit·e pour la saison {seasonLabel}</p>
      ) : (
        <ul className="flex flex-col overflow-hidden rounded-2xl border border-white/10 bg-white/5">
          <li className="flex items-center justify-between px-4 py-3.5">
            <span className="text-[13.5px] text-white/50">Saison</span>
            <span className="text-[14px] font-bold text-white">{seasonLabel}</span>
          </li>
          {/* licenceNumber is nullable (Membership entity) — omitted rather
              than a dash/placeholder row, same convention RoleScopeBlock
              already applies to unresolvable scope lines. */}
          {membership.licenceNumber != null && (
            <li className="flex items-center justify-between border-t border-white/10 px-4 py-3.5">
              <span className="text-[13.5px] text-white/50">Licence</span>
              <span className="text-[14px] font-bold text-white">{membership.licenceNumber}</span>
            </li>
          )}
          <li className="flex items-center justify-between border-t border-white/10 px-4 py-3.5">
            <span className="text-[13.5px] text-white/50">Statut</span>
            <MembershipStatusBadge status={membership.status} />
          </li>
          <li className="flex items-center justify-between border-t border-white/10 px-4 py-3.5">
            <span className="text-[13.5px] text-white/50">Valide jusqu'au</span>
            <span className="text-[14px] font-bold text-white">{formatValidUntil(membership.validUntil)}</span>
          </li>
        </ul>
      )}
    </section>
  )
}
