import { useDomainDependencies } from './use-domain-dependencies'

export function useNewsDependencies() {
  return useDomainDependencies('News', (container) => container.news)
}
