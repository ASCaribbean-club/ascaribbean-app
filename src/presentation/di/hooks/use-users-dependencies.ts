import { useDomainDependencies } from './use-domain-dependencies'

export function useUsersDependencies() {
  return useDomainDependencies('Users', (container) => container.users)
}
