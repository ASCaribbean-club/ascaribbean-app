import { Skeleton } from '@presentation/shared/components/ui/skeleton'

// Mockup state 5 — skeleton of the balance card and a few history rows.
export function LegacyLoadingState() {
  return (
    <div aria-busy="true" className="flex flex-col gap-3 px-5.5 pb-8">
      <Skeleton className="h-32 rounded-3xl" />
      {Array.from({ length: 5 }, (_, i) => (
        <Skeleton key={i} className="h-14 rounded-2xl" />
      ))}
    </div>
  )
}
