import { RoleScopeBlock, type RoleScopeBlockProps } from './RoleScopeBlock'

// Flat variant (UI design §"Bloc rôles — variante à plat", 0 or 1 distinct
// role): renders the same RoleScopeBlock the tabbed variant reuses inside
// each TabsContent (RoleTabs.tsx). No Card/title wrapper here — the role's
// French label is already shown once, as the pill under the name in
// ProfileIdentityHeader (docs/designs/profile-page/).
export function RoleCard(props: RoleScopeBlockProps) {
  return <RoleScopeBlock {...props} />
}
