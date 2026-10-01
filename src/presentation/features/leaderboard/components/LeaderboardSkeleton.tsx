import { Skeleton } from '@presentation/shared/components/ui/skeleton'

// UI design §6 — ~8 rows at the real row height to avoid layout shift.
export function LeaderboardSkeleton() {
  return (
    <div aria-busy="true" className="flex flex-col gap-2">
      <span className="sr-only">Chargement du classement</span>
      {Array.from({ length: 8 }, (_, index) => (
        <Skeleton key={index} className="h-14 w-full bg-white/10" />
      ))}
    </div>
  )
}
