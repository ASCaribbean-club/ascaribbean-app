import { useActiveRoleContext } from '../../app/providers/active-role-provider'

export function useActiveRole() {
  return useActiveRoleContext()
}
