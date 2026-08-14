import { createContext, type PropsWithChildren } from 'react'
import { createContainer, type Container } from '../../di/container'

export const DependenciesContext = createContext<Container | null>(null)

const container = createContainer()

export function DependenciesProvider({ children }: PropsWithChildren) {
  return <DependenciesContext.Provider value={container}>{children}</DependenciesContext.Provider>
}
