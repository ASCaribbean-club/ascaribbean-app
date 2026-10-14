import { useContext } from 'react'
import { DependenciesContext } from '../../app/providers/dependencies-provider'
import { noopObservability } from '@presentation/shared/observability/noop-observability'
import type { Observability } from '@presentation/shared/observability/observability'

// Contrairement aux autres hooks de dépendances, pas d'exception sans provider :
// la télémétrie ne doit jamais faire planter l'écran (ni un test de ViewModel
// qui ne l'utilise pas) — repli sur l'implémentation muette.
export function useObservability(): Observability {
  const container = useContext(DependenciesContext)
  return container?.observability.observability ?? noopObservability
}
