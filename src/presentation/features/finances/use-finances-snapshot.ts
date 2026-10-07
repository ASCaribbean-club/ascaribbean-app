import { useQuery } from '@tanstack/react-query'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/mob-treasurer-finances.md AC-FI-27 — ONE aggregated read of the
// current season. `enabled` follows can('finances:read'): a role without it
// never fires the request (the SQL function would refuse it anyway).
export function useFinancesSnapshot(enabled: boolean) {
  const { getFinancesUseCase } = useFinancesDependencies()
  return useQuery({
    queryKey: queryKeys.financesSnapshot(),
    queryFn: () => getFinancesUseCase.execute(),
    enabled,
  })
}
