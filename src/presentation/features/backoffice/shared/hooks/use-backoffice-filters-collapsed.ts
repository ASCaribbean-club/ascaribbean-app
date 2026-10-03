import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePersistedBoolean } from '@presentation/shared/hooks/use-persisted-boolean'

// Filter bar collapsed/expanded state of one backoffice screen — per user, per
// device (localStorage). Collapsed by default on every screen; the user's own
// choice, once made, overrides that.
export function useBackofficeFiltersCollapsed(screenId: string) {
  const { user } = useAuth()
  const [areFiltersCollapsed, toggleFiltersCollapsed] = usePersistedBoolean(
    `backoffice.${screenId}.filtersCollapsed:${user?.id ?? 'anonymous'}`,
    true,
  )

  return { areFiltersCollapsed, toggleFiltersCollapsed }
}
