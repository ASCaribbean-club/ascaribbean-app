import { RouterProvider } from 'react-router-dom'
import { AuthProvider } from './providers/auth-provider'
import { DependenciesProvider } from './providers/dependencies-provider'
import { QueryProvider } from './providers/query-provider'
import { router } from './router'

export function App() {
  return (
    <DependenciesProvider>
      <QueryProvider>
        <AuthProvider>
          <RouterProvider router={router} />
        </AuthProvider>
      </QueryProvider>
    </DependenciesProvider>
  )
}
