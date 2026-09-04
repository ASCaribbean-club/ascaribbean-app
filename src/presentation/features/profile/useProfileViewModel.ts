import { useQuery } from '@tanstack/react-query'
import { useNavigate } from 'react-router-dom'
import type { Membership } from '@domain/entities/membership'
import { distinctRoles, type PlayerPosition, type Role } from '@domain/entities/user'
import { useAuthDependencies } from '@presentation/di/hooks/use-auth-dependencies'
import { useProfileDependencies } from '@presentation/di/hooks/use-profile-dependencies'
import { getInitials } from '@presentation/shared/formatters/greeting'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { queryKeys } from '@presentation/shared/query-keys'

// Developer feedback 2026-09-04: the actual profile-page mockups (both
// variantes — see docs/designs/DESIGN_LINKS.md §2) carry no charter or
// documents section at all. Dropped from this ViewModel entirely rather
// than fetched-but-unrendered: specs/profile-page.md §1 point 4/5 and
// AC-PR-14/AC-PR-15 still describe this data as in scope for "Mon profil",
// so this is a flagged spec/design discrepancy, not a resolved one — see
// the same note left on ProfilePage.tsx.

// UI design "ViewModel — ce que useProfileViewModel doit exposer" — one
// entry per DISTINCT role (PR-1), never per RoleAssignment/affectation.
// `scopeLines` comes straight from GetProfileRoleScopesUseCase (already
// resolved + filtered, AC-PR-06) — this hook only adds `showPosition`,
// which needs `user.position` (a fact GetProfileRoleScopesUseCase, working
// only from `RoleAssignment[]`, doesn't have).
export interface ProfileRoleBlock {
  role: Role
  scopeLines: string[]
  // 2026-09-04 addendum (specs/profile-page.md) — "who coaches my team",
  // player role only. Empty for every other role, same convention as
  // scopeLines rather than undefined.
  coachNames: string[]
  // Developer follow-up on the same addendum — player's own team section(s)
  // and the current season, also player-only (GetProfileRoleScopesUseCase's
  // own comment). sectionNames stays an array like scopeLines/coachNames;
  // seasonLabel is singular since a player's teams never straddle two
  // seasons (TeamRepository already scopes to the current one).
  sectionNames: string[]
  seasonLabel: string | null
  showPosition: boolean
}

export function useProfileViewModel() {
  const { user } = useAuth()
  const navigate = useNavigate()
  const { signOutUseCase } = useAuthDependencies()
  const { getProfileRoleScopesUseCase, getProfileMembershipUseCase } = useProfileDependencies()

  const roleScopesQuery = useQuery({
    queryKey: queryKeys.profileRoleScopes(user?.id ?? ''),
    queryFn: () => getProfileRoleScopesUseCase.execute({ roles: user!.roles }),
    enabled: !!user,
  })

  // Own query, own loading flag — same "supplementary, not part of the
  // core dossier read" treatment as documentsQuery below, not folded into
  // isLoading/error: a membership row can legitimately be absent (member
  // not yet registered for the current season) without that being a
  // screen-level error.
  const membershipQuery = useQuery({
    queryKey: queryKeys.profileMembership(user?.id ?? ''),
    queryFn: () => getProfileMembershipUseCase.execute({ userId: user!.id }),
    enabled: !!user,
  })

  // specs/profile-page.md §1 "La bascule onglets / à plat" and "ViewModel —
  // ce que useProfileViewModel doit exposer" (AC-PR-01/02/04/06/07/08):
  // roles is the distinct `RoleAssignment['role']` values on `user.roles`
  // (domain/entities/user.ts `distinctRoles`, shared with
  // GetProfileRoleScopesUseCase) — NOT `user.roles.length`, and NEVER
  // derived from useActiveRole()/DashboardRole (AC-PR-04). hasTabs requires
  // at least TWO distinct roles — a single role is the flat variant, not a
  // one-tab bar (AC-PR-01/02).
  const roles: Role[] = distinctRoles(user?.roles ?? [])
  const hasTabs = roles.length >= 2
  const hasNoRoles = roles.length === 0
  const roleBlocks: ProfileRoleBlock[] = roles.map((role) => {
    const scope = roleScopesQuery.data?.find((entry) => entry.role === role)
    return {
      role,
      scopeLines: scope?.scopeLines ?? [],
      coachNames: scope?.coachNames ?? [],
      sectionNames: scope?.sectionNames ?? [],
      seasonLabel: scope?.seasonLabel ?? null,
      showPosition: role === 'player' && user?.position != null,
    }
  })

  return {
    isLoading: roleScopesQuery.isLoading,
    // A failure here is a real error — unlike some dashboard queries, this
    // screen has no meaningful "partial" rendering of someone's own dossier.
    error: roleScopesQuery.error,

    /// --- Identity block (§1 point 1 — already in memory via useAuth()) ---
    fullName: user?.fullName ?? '',
    // Same formatter CoachHeader/PlayerHeader already use for their own
    // avatar — kept identical rather than reimplemented here.
    initials: user ? getInitials(user.fullName) : '',
    // Raw value, not pre-formatted: the Page calls formatPlayerPosition
    // itself (spec: "formatage pur, pas une règle métier", not this hook's
    // job) for whichever role block has showPosition === true.
    position: (user?.position ?? null) as PlayerPosition | null,

    /// --- Role block (§1 points 2/3, §"La bascule onglets / à plat") ---
    // Named `distinctRoles` here to keep the ProfilePage-facing API stable
    // (the domain function of the same name is only used to compute this
    // array above — returning it directly here would leak the function
    // itself instead of the data, since JS shorthand resolves to whatever
    // `distinctRoles` refers to in scope).
    distinctRoles: roles,
    hasTabs,
    hasNoRoles,
    roleBlocks,

    /// --- Membership block (2026-09-04 addendum, PO-PR-06) — wired here
    /// per explicit developer request, not yet rendered by ProfilePage.tsx:
    /// same "ViewModel ahead of the mockup" situation this file's own
    /// top-of-file note already documents for charter/documents, flagged
    /// rather than silently omitted. ---
    // null while membershipQuery hasn't resolved yet OR the member has no
    // row for the current season (both valid states, see membershipQuery's
    // own comment) — membershipLoading is how the Page tells them apart.
    membership: (membershipQuery.data?.membership ?? null) as Membership | null,
    membershipSeasonLabel: membershipQuery.data?.seasonLabel ?? null,
    membershipLoading: membershipQuery.isLoading,
    // A real fetch failure (network, RLS) must render as an error, not as
    // the legitimate "no season/no row" empty state — both otherwise leave
    // membershipQuery.data undefined and would be indistinguishable to
    // MembershipSection.
    membershipError: membershipQuery.isError,

    /// --- Identity header's own action ---
    onLogout: () => {
      void signOutUseCase.execute()
    },

    // specs/profile-page.md, router course-correction 2026-09-04: this
    // screen is a pushed route (reached from the dashboard avatar), not
    // AppShell content — same "BackHeader + navigate(-1)" pattern as
    // useConvocationDetailViewModel.goBack, not AppShell's own chrome.
    goBack: () => navigate(-1),
  }
}
