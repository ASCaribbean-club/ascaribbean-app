import { useDomainDependencies } from './use-domain-dependencies'

export function useFinanceCarriersDependencies() {
  return useDomainDependencies('FinanceCarriers', (container) => container.financeCarriers)
}
