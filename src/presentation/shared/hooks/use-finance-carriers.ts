import { useQuery } from '@tanstack/react-query'
import { useFinancesDependencies } from '@presentation/di/hooks/use-finances-dependencies'
import { queryKeys } from '@presentation/shared/query-keys'

// specs/mob-treasurer-finances.md AC-FI-31 / UI design §9 — the carriers
// offered by the optional "Porteur" field of the two payment forms. A failed or
// empty read yields NO options: the field is then not rendered and the payment
// behaves as "Non précisé" (no retry, no blocking error).
export function useFinanceCarrierOptions() {
  const { listFinanceCarriersUseCase } = useFinancesDependencies()
  const query = useQuery({
    queryKey: queryKeys.financeCarriers(),
    queryFn: () => listFinanceCarriersUseCase.execute(),
    retry: false,
  })
  return (query.data ?? []).map((carrier) => ({ value: carrier.id, label: carrier.label }))
}
