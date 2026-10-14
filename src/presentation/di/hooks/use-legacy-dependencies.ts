import { useDomainDependencies } from './use-domain-dependencies'

export function useLegacyDependencies() {
  return useDomainDependencies('Legacy', (container) => container.legacy)
}
