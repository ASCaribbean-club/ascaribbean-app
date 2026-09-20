import { RouterProvider } from 'react-router-dom'
import { TooltipProvider } from '@presentation/shared/components/ui/tooltip'
import { AuthProvider } from './providers/auth-provider'
import { DependenciesProvider } from './providers/dependencies-provider'
import { QueryProvider } from './providers/query-provider'
import { router } from './router'

// specs/web-users.md UI design, "Icône d'avertissement de ligne" — the
// first consumer of the shadcn Tooltip primitive in this repo
// (`npx shadcn add tooltip`, CLAUDE.md §2). Radix's TooltipPrimitive.Root
// throws if rendered without an ancestor Provider, so this wraps the whole
// app once here rather than locally around each tooltip consumer.
export function App() {
  return (
    <DependenciesProvider>
      <QueryProvider>
        <AuthProvider>
          <TooltipProvider>
            <RouterProvider router={router} />
          </TooltipProvider>
        </AuthProvider>
      </QueryProvider>
    </DependenciesProvider>
  )
}
