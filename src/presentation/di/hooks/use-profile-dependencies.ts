import { useDomainDependencies } from './use-domain-dependencies'

export function useProfileDependencies() {
  return useDomainDependencies('Profile', (container) => container.profile)
}
