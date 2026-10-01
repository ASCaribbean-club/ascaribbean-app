import { Skeleton } from '@presentation/shared/components/ui/skeleton'

export function AttendanceRosterSkeleton() {
  return (
    <div className="flex max-w-2xl flex-col gap-3" aria-busy="true">
      {Array.from({ length: 8 }).map((_, index) => (
        // Static placeholders, no id.
        <Skeleton key={index} className="h-16 w-full rounded-xl" />
      ))}
    </div>
  )
}
