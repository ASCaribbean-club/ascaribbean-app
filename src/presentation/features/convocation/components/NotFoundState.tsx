import { IconSearchOff } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'

// AC-MD-01 — rendered identically whether the convocationId doesn't exist
// at all or exists but is outside the caller's RLS scope (another team's
// convocation): GetConvocationWithDetailsUseCase collapses both into the
// same `null`, and this component has no way to tell them apart even if it
// wanted to — which is the entire point (no existence leak, §1 "Périmètre
// de données"). Deliberately generic copy: no convocation type is known at
// this point, so nothing more specific than "Convocation introuvable" can
// be said.
export function NotFoundState() {
  return <EmptyState icon={IconSearchOff} message="Convocation introuvable" />
}
