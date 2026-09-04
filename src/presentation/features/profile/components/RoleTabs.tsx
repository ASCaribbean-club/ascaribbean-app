import { Tabs, TabsContent, TabsList, TabsTrigger } from '@presentation/shared/components/ui/tabs'
import { formatRole } from '@presentation/shared/formatters/role-labels'
import type { ProfileRoleBlock } from '../useProfileViewModel'
import { RoleScopeBlock } from './RoleScopeBlock'

interface RoleTabsProps {
  roleBlocks: ProfileRoleBlock[]
}

// Multi-role variant (UI design §"Bloc rôles — variante à onglets",
// AC-PR-01): one TabsTrigger per DISTINCT role. This component never
// re-derives the ≥2-roles cardinality rule (PR-1) itself — `roleBlocks`
// already carries exactly one entry per distinct role, computed once in
// useProfileViewModel, never from useActiveRole()/DashboardRole (AC-PR-04).
// No position prop here (v4, docs/designs/profile-page/): position renders
// once as a pill in ProfileIdentityHeader regardless of which tab is
// active, not per-tab — see that component and ProfilePage's call site.
export function RoleTabs({ roleBlocks }: RoleTabsProps) {
  const defaultRole = roleBlocks[0]?.role

  return (
    <Tabs defaultValue={defaultRole} className="gap-4">
      {/* overflow-x-auto on the wrapper: up to 8 distinct roles is
          theoretically possible (the CDC's 8-role union, spec §6 "jusqu'à 8
          onglets théoriquement") even though no mockup shows more than 2.
          Radix's TabsList is `inline-flex w-fit` and neither wraps nor
          scrolls on its own — without this a long role list would overflow
          past the screen edge on a narrow phone instead of scrolling.
          Never wrap to a second row (breaks the one-row tab pattern) and
          never truncate a label (AC-PR-03 requires the full French label). */}
      <div className="overflow-x-auto px-5.5">
        {/* v4 style: segmented control — a rounded-2xl track, each trigger
            a rounded-xl slab with a green underline when active, uppercase
            label. Overridden at this call site rather than in the vendored
            primitive (CLAUDE.md §2). */}
        <TabsList className="h-auto w-full flex-nowrap justify-start gap-1 rounded-2xl bg-white/5 p-1.5">
          {roleBlocks.map((block) => (
            // h-11 (~44px): shadcn's vendored TabsTrigger defaults to
            // h-9/py-1 (~36px), under the mobile touch-target floor
            // (CLAUDE.md §6) — bumped at this call site, same pattern as
            // BackHeader's size-9.5 -> size-11 correction.
            <TabsTrigger
              key={block.role}
              value={block.role}
              className="h-11 shrink-0 rounded-xl border-b-2 border-transparent px-4 text-[13px] font-bold tracking-wide text-white/60 uppercase data-[state=active]:border-b-coach-green data-[state=active]:bg-white/10 data-[state=active]:text-white"
            >
              {formatRole(block.role)}
            </TabsTrigger>
          ))}
        </TabsList>
      </div>

      {roleBlocks.map((block) => (
        <TabsContent key={block.role} value={block.role} className="px-5.5">
          <RoleScopeBlock
            role={block.role}
            scopeLines={block.scopeLines}
            coachNames={block.coachNames}
            sectionNames={block.sectionNames}
            seasonLabel={block.seasonLabel}
          />
        </TabsContent>
      ))}
    </Tabs>
  )
}
