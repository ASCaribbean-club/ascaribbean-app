import { useEffect, type PropsWithChildren } from 'react'
import { useObservability } from '@presentation/di/hooks/use-observability'
import { ErrorBoundary } from './ErrorBoundary'
import { installGlobalErrorHandlers } from './install-global-error-handlers'

// Branche les deux premiers points de capture (rendu + hors rendu). Le
// troisième — onError des mutations — vit dans les ViewModels.
export function AppErrorBoundary({ children }: PropsWithChildren) {
  const observability = useObservability()
  useEffect(() => installGlobalErrorHandlers(observability), [observability])
  return <ErrorBoundary observability={observability}>{children}</ErrorBoundary>
}
