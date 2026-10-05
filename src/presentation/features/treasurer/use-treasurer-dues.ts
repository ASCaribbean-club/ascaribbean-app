import { useQuery } from "@tanstack/react-query";
import { useTreasurerDependencies } from "@presentation/di/hooks/use-treasurer-dependencies";
import { queryKeys } from "@presentation/shared/query-keys";

// specs/mobile-treasurer.md AC-TR-24 — ONE aggregated read shared by the
// dashboard and the list (same cache entry, never one request per member).
export function useTreasurerDues(enabled: boolean) {
  const { getTreasurerDuesUseCase } = useTreasurerDependencies();
  return useQuery({
    queryKey: queryKeys.treasurerDues(),
    queryFn: () => getTreasurerDuesUseCase.execute(),
    enabled,
  });
}
