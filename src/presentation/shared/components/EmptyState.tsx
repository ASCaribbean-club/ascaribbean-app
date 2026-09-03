import type { IconSearchOff } from '@tabler/icons-react'

interface EmptyStateProps {
  icon: typeof IconSearchOff
  message: string
}

// ARCHITECTURE.md §13.4 lists EmptyState among the shared design-system
// components — this is that primitive, extracted from NotFoundState.tsx and
// RoleMismatchState.tsx once a second call site made the duplicated
// container/icon/message markup worth centralizing.
export function EmptyState({ icon: Icon, message }: EmptyStateProps) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center text-white">
      <Icon className="size-9 text-white/40" aria-hidden />
      <p className="text-[14.5px] font-semibold text-white/70">{message}</p>
    </div>
  )
}
