import { useEffect, useMemo } from 'react'
import { Outlet, useMatches } from 'react-router-dom'
import { distinctRoles } from '@domain/entities/user'
import { useObservability } from '@presentation/di/hooks/use-observability'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { toRoutePattern } from './route-pattern'

// Route racine : une page vue par changement de route, en motif
// ("/convocations/:id"), et l'identification (UUID + rôles) de la session.
export function ObservabilityRoot() {
  const observability = useObservability()
  const { user } = useAuth()
  const matches = useMatches()
  const leaf = matches[matches.length - 1]
  const route = leaf ? toRoutePattern(leaf.pathname, leaf.params) : '/'

  useEffect(() => {
    observability.track({ name: 'screen_viewed', props: { route } })
  }, [observability, route])

  const userId = user?.id
  const roles = useMemo(() => (user ? distinctRoles(user.roles) : []), [user])
  useEffect(() => {
    if (userId) {
      observability.identify(userId, roles)
      // Mesure d'usage activée dès qu'une session existe (intérêt légitime,
      // point consentement à valider par le référent RGPD).
      observability.enableAnalytics()
    } else observability.reset()
  }, [observability, userId, roles])

  return <Outlet />
}
