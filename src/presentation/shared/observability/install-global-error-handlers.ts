import type { Observability } from './observability'
import { shouldReportError } from './should-report-error'

// Erreurs hors rendu (callbacks, timers) et promesses rejetées sans catch :
// l'ErrorBoundary ne les voit pas. Retourne la fonction de désinstallation.
export function installGlobalErrorHandlers(observability: Observability, target: Window = window): () => void {
  const onError = (event: ErrorEvent) => {
    const error = event.error ?? new Error('window error')
    if (shouldReportError(error)) observability.reportError(error, { source: 'window_error' })
  }
  const onRejection = (event: PromiseRejectionEvent) => {
    if (shouldReportError(event.reason)) observability.reportError(event.reason, { source: 'unhandled_rejection' })
  }
  // Connectivité : mesure le besoin du futur mode dégradé.
  const onOffline = () => observability.track({ name: 'app_went_offline', props: {} })

  target.addEventListener('error', onError)
  target.addEventListener('unhandledrejection', onRejection)
  target.addEventListener('offline', onOffline)
  return () => {
    target.removeEventListener('error', onError)
    target.removeEventListener('unhandledrejection', onRejection)
    target.removeEventListener('offline', onOffline)
  }
}
