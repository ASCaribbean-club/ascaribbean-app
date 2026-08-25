import { useDomainDependencies } from './use-domain-dependencies'

export function useConvocationDependencies() {
  return useDomainDependencies('Convocation', (container) => container.convocation)
}