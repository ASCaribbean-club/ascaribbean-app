import type { ReactNode } from 'react'
import { Tooltip, TooltipContent, TooltipTrigger } from '@presentation/shared/components/ui/tooltip'

interface SidebarTooltipProps {
  label: string
  // Only the collapsed (icon-only) sidebar needs a tooltip — expanded, the
  // label is already visible, so the child is rendered untouched.
  enabled: boolean
  children: ReactNode
}

export function SidebarTooltip({ label, enabled, children }: SidebarTooltipProps) {
  if (!enabled) return <>{children}</>

  return (
    <Tooltip>
      <TooltipTrigger asChild>{children}</TooltipTrigger>
      <TooltipContent side="right" sideOffset={8}>
        {label}
      </TooltipContent>
    </Tooltip>
  )
}
