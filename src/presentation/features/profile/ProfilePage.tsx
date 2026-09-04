import { formatPlayerPosition } from '@presentation/shared/formatters/player-position-labels'
import { formatRole } from '@presentation/shared/formatters/role-labels'
import { BackHeader } from '@presentation/shared/layout/BackHeader'
import { MembershipSection } from './components/MembershipSection'
import { ProfileIdentityHeader } from './components/ProfileIdentityHeader'
import { RoleCard } from './components/RoleCard'
import { RoleTabs } from './components/RoleTabs'
import { useProfileViewModel } from './useProfileViewModel'

// UI design §"Structure commune aux deux variantes" — 2 stacked zones:
// identity (never duplicated per role), then the role zone (the only one
// whose SHAPE changes, flat vs tabbed). This Page only branches on booleans
// the ViewModel already computed (CLAUDE.md §6, ARCHITECTURE.md §6) —
// hasTabs/hasNoRoles decide WHICH role zone to render, nothing here
// recomputes them from user.roles.
//
// Developer feedback 2026-09-04: the actual profile-page mockups (both
// variantes, docs/designs/DESIGN_LINKS.md §2) carry no charter or documents
// section — dropped from this screen entirely (CharterStatusRow/
// DocumentsSection components and their own sub-components stay in
// components/, currently unused, not deleted since specs/profile-page.md §1
// point 4/5 and AC-PR-14/AC-PR-15 still describe this data as in scope for
// "Mon profil". Flagged discrepancy between spec and mockup, not resolved
// here — same "don't resolve an OPEN point, flag it" rule as any other spec
// gap.
//
// PO-PR-05 resolved by the developer 2026-09-04: this screen is reached by
// tapping the avatar on the dashboard header (CoachHeader/PlayerHeader),
// pushed OVER the current tab — same "no BottomNav, BackHeader for the way
// back" pattern as ConvocationDetailPage, not the Menu-tab/AppShell content
// originally assumed (see router.tsx). BackHeader is this screen's ONLY way
// back, same reasoning as ConvocationDetailPage's own comment on that.
export function ProfilePage() {
  const vm = useProfileViewModel()

  if (vm.isLoading) {
    return (
      <div className="flex flex-col text-white">
        <BackHeader title="Profil" onBack={vm.goBack} />
        <div className="flex min-h-[60svh] items-center justify-center px-6 text-center text-white/60">Chargement…</div>
      </div>
    )
  }

  if (vm.error) {
    return (
      <div className="flex flex-col text-white">
        <BackHeader title="Profil" onBack={vm.goBack} />
        <div className="flex min-h-[60svh] items-center justify-center px-6 text-center text-white/60">Une erreur est survenue.</div>
      </div>
    )
  }

  // formatPlayerPosition is a pure formatter (like RosterRow's own use of
  // it) — called here, once, rather than inside RoleScopeBlock, per the
  // spec's explicit wording for this ViewModel: "la Page appelle
  // formatPlayerPosition elle-même, formatage pur, pas une règle métier".
  const positionLabel = formatPlayerPosition(vm.position)

  // Role pill: flat variant only (AC-PR-01/02/08). v4 (docs/designs/profile-page/)
  // shows the role as a pill next to the position pill, but the tabbed
  // variant's own mockup has no such pill — the TabsList already says which
  // role is active, so this stays gated on the flat case.
  const flatRoleBlock = !vm.hasTabs && !vm.hasNoRoles ? vm.roleBlocks[0] : undefined

  // Position pill: NOT gated on the flat variant — v4's tabbed mockup still
  // shows a position pill in the identity card regardless of which tab is
  // active, so this is a fact about the person (User.position), not about
  // whichever role block happens to be selected.
  const showPositionPill = vm.roleBlocks.some((block) => block.showPosition)

  return (
    <div className="flex flex-col text-white">
      <BackHeader title="Profil" onBack={vm.goBack} />

      <div className="flex flex-col gap-6 pb-8">
        <ProfileIdentityHeader
          fullName={vm.fullName}
          initials={vm.initials}
          roleLabel={flatRoleBlock ? formatRole(flatRoleBlock.role) : null}
          positionLabel={showPositionPill ? positionLabel : null}
        />

        {/* specs/profile-page.md §7 addendum (2026-09-04, resolves PO-PR-06)
            — placed right after the role block, per that addendum's own
            "à la suite du bloc rôles". Always rendered (unlike the role
            block, which can be entirely absent for AC-PR-08's 0-role case)
            — MembershipSection itself branches on loading/no-season/absent. */}
        <MembershipSection
          membership={vm.membership}
          seasonLabel={vm.membershipSeasonLabel}
          loading={vm.membershipLoading}
          error={vm.membershipError}
        />

        {/* AC-PR-01/02/08 — exactly one of: a TabsList (2+ distinct roles),
            a single scope block (1 distinct role), or nothing at all
            (0 roles) — never both, never an empty placeholder for the
            0-role case. */}
        {vm.hasTabs && <RoleTabs roleBlocks={vm.roleBlocks} />}
        {flatRoleBlock && (
          <div className="px-5.5">
            <RoleCard
              role={flatRoleBlock.role}
              scopeLines={flatRoleBlock.scopeLines}
              coachNames={flatRoleBlock.coachNames}
              sectionNames={flatRoleBlock.sectionNames}
              seasonLabel={flatRoleBlock.seasonLabel}
            />
          </div>
        )}
      </div>
    </div>
  )
}
