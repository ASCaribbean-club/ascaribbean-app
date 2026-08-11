import type { Action } from '@domain/policies/actions'
import { can, type AuthorizationContext } from '@domain/policies/can'
import { useAuth } from './use-auth'

export function usePermission(action: Action, context?: AuthorizationContext): boolean {
  const { user } = useAuth()
  if (!user) return false
  return can(user, action, context)
}
