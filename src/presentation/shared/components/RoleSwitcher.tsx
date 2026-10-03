import { formatRole } from '@presentation/shared/formatters/role-labels'
import { useActiveRole } from '@presentation/shared/hooks/use-active-role'
import type { DashboardRole } from '@presentation/app/providers/active-role-provider'
import { Pill } from './Pill'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select'

// Same look as Pill, on shadcn's Select trigger (see CoachHeader's team
// selector for the same reshaping). min-h-11: touch-target floor (CLAUDE.md §6).
const ROLE_SELECT_TRIGGER_CLASSNAME =
  'h-auto min-h-11 w-auto gap-1.5 rounded-full border-white/15 bg-white/10 px-3 py-1.5 text-[12.5px] font-bold text-white [&>svg]:size-3.5 [&>svg]:text-white/60 [&>svg]:opacity-100'

function RoleIcon() {
  return <img src="/icons/icon-512.png" alt="" aria-hidden className="size-5.5 shrink-0 rounded-full object-cover" />
}

// Dashboard header role chip. One role: static pill. Two: tap to switch.
// Three or more: a dropdown, since cycling blindly through three roles
// would make a specific one slow to reach.
export function RoleSwitcher() {
  const { activeRole, dashboardRoles, setActiveRole, toggleActiveRole } = useActiveRole()

  if (dashboardRoles.length > 2) {
    return (
      <Select value={activeRole} onValueChange={(role) => setActiveRole(role as DashboardRole)}>
        <SelectTrigger aria-label="Changer de rôle" className={ROLE_SELECT_TRIGGER_CLASSNAME}>
          <RoleIcon />
          <SelectValue />
        </SelectTrigger>
        <SelectContent>
          {dashboardRoles.map((role) => (
            <SelectItem key={role} value={role} className="min-h-11">
              {formatRole(role)}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    )
  }

  const canSwitch = dashboardRoles.length > 1
  return (
    <Pill onClick={toggleActiveRole} disabled={!canSwitch} className="min-h-11 disabled:cursor-default">
      <RoleIcon />
      {formatRole(activeRole)}
      {canSwitch && <span className="text-white/60">▾</span>}
    </Pill>
  )
}
