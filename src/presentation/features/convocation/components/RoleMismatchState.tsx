import { IconUserQuestion } from '@tabler/icons-react'
import { EmptyState } from '@presentation/shared/components/EmptyState'

// specs/match_details_page.md, "Emplacement dans la nav" (resolution) —
// rendered when the dashboard's active role tab doesn't apply to this
// convocation's team (hasActiveRoleForConvocation === false).
export function RoleMismatchState({ activeRoleLabel }: { activeRoleLabel: string }) {
  return (
    <EmptyState
      icon={IconUserQuestion}
      message={`Cette convocation ne concerne pas votre rôle actif : ${activeRoleLabel}`}
    />
  )
}
