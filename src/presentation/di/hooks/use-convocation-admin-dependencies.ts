import { useDomainDependencies } from './use-domain-dependencies'

export function useConvocationAdminDependencies() {
  return useDomainDependencies('ConvocationAdmin', (container) => container.convocationAdmin)
}
