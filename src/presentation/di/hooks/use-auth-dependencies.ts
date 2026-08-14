import { useDomainDependencies } from './use-domain-dependencies'

export function useAuthDependencies() {
  return useDomainDependencies('Auth', (container) => container.auth)
}
