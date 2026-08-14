import { useContext } from 'react'
import { DependenciesContext } from '../../app/providers/dependencies-provider'
import type { Container } from '../container'

// Internal helper — not exported per-domain. Each use-<domain>-dependencies.ts
// file wraps this with its own selector and domain name.
export function useDomainDependencies<T>(domainName: string, select: (container: Container) => T): T {
  const context = useContext(DependenciesContext)
  if (!context) {
    throw new Error(`use${domainName}Dependencies must be used within a DependenciesProvider`)
  }
  return select(context)
}
