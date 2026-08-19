import type { ComponentProps } from 'react'
import { cn } from '../lib/utils'

// A translucent rounded selector pill on a dark surface (coach-dashboard
// header: role pill, team pill). Not a shadcn Badge — Badge is a static
// status indicator (bg-primary, non-interactive by default); this is
// always a clickable button with its own translucent-on-dark treatment
// that doesn't generalize to Badge's light/dark-aware variants.
export function Pill({ className, ...props }: ComponentProps<'button'>) {
  return (
    <button
      type="button"
      className={cn(
        'inline-flex items-center gap-1.5 rounded-full border border-white/15 bg-white/10 px-3 py-1.5 text-[12.5px] font-bold text-white',
        className
      )}
      {...props}
    />
  )
}
