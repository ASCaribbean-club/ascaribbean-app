import { useDomainDependencies } from './use-domain-dependencies'

export function useFinancesDependencies() {
  return useDomainDependencies('Finances', (container) => container.finances)
}
