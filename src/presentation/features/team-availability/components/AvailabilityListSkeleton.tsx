import { Skeleton } from '@presentation/shared/components/ui/skeleton'

export function AvailabilityListSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Chargement">
      <div className="grid grid-cols-3 gap-2.5">
        {[0, 1, 2].map((i) => (
          <Skeleton key={i} className="h-16 min-w-0 rounded-2xl bg-white/10" />
        ))}
      </div>
      <div className="flex flex-col gap-2.5">
        {[0, 1, 2, 3, 4].map((i) => (
          <div key={i} className="flex min-h-14 items-center gap-3 rounded-3xl border border-white/10 bg-white/5 px-4 py-3">
            <Skeleton className="size-11 shrink-0 rounded-full bg-white/10" />
            <div className="flex min-w-0 flex-1 flex-col gap-1.5">
              <Skeleton className="h-4 w-1/2 bg-white/10" />
              <Skeleton className="h-3 w-1/3 bg-white/10" />
            </div>
            <Skeleton className="h-7 w-24 shrink-0 rounded-full bg-white/10" />
          </div>
        ))}
      </div>
    </div>
  )
}
