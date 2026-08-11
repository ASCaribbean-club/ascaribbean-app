import type { Role } from '../entities/user'
import type { Action } from './actions'

// Source de référence lisible — chaque politique RLS porte en commentaire SQL
// le nom de l'action correspondante pour vérifier la correspondance à l'œil.
export const rbacMatrix: Record<Action, Role[]> = {
  'convocation:create': ['coach', 'authorized-officer', 'admin'],
  'convocation:respond': ['player'],
  'section:manage': ['section-manager', 'admin'],
}
