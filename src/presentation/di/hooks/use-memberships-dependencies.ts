import { useDomainDependencies } from './use-domain-dependencies'

export function useMembershipsDependencies() {
  return useDomainDependencies('Memberships', (container) => container.memberships)
}
