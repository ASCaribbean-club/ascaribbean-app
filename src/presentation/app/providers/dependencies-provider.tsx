import { createContext, useContext, type PropsWithChildren } from 'react'
import { createContainer, type Container } from '../../di/container'

const DependenciesContext = createContext<Container | null>(null)

const container = createContainer()

export function DependenciesProvider({ children }: PropsWithChildren) {
  return <DependenciesContext.Provider value={container}>{children}</DependenciesContext.Provider>
}

export function useDependencies(): Container {
  const context = useContext(DependenciesContext)
  if (!context) {
    throw new Error('useDependencies must be used within a DependenciesProvider')
  }
  return context
}
