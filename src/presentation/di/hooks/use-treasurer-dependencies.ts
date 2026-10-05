import { useDomainDependencies } from './use-domain-dependencies'

export function useTreasurerDependencies() {
  return useDomainDependencies('Treasurer', (container) => container.treasurer)
}
