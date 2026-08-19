import type { ComponentProps } from 'react'
import { cn } from '../lib/utils'

// A small decorative color dot (coach-dashboard header's context-line
// bullet, status markers). Pass color/size via className — there's no
// shadcn primitive for this, it's too small/single-purpose to warrant one.
export function Dot({ className, ...props }: ComponentProps<'span'>) {
  return <span aria-hidden className={cn('inline-block size-[5px] shrink-0 rounded-full', className)} {...props} />
}
