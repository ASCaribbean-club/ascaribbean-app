import { Component, type ErrorInfo, type PropsWithChildren } from 'react'
import type { Observability } from './observability'
import { shouldReportError } from './should-report-error'

interface Props extends PropsWithChildren {
  observability: Observability
}

interface State {
  hasError: boolean
}

// Plante au rendu = écran blanc sans ceci. Classe obligatoire : React n'expose
// getDerivedStateFromError / componentDidCatch que sur les class components.
// Écran de repli volontairement minimal (pas de page d'erreur du design system).
export class ErrorBoundary extends Component<Props, State> {
  state: State = { hasError: false }

  static getDerivedStateFromError(): State {
    return { hasError: true }
  }

  componentDidCatch(error: Error, _info: ErrorInfo) {
    if (shouldReportError(error)) {
      this.props.observability.reportError(error, { source: 'error_boundary' })
    }
  }

  render() {
    if (!this.state.hasError) return this.props.children
    return (
      <div role="alert" className="flex min-h-dvh flex-col items-center justify-center gap-4 p-6 text-center">
        <p className="text-base">Une erreur est survenue.</p>
        <button type="button" className="h-11 rounded-md border px-4" onClick={() => window.location.reload()}>
          Recharger l’application
        </button>
      </div>
    )
  }
}
