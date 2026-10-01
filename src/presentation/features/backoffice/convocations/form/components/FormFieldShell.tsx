import type { ReactNode } from 'react'
import { Label } from '@presentation/shared/components/ui/label'

interface FormFieldShellProps {
  id: string
  label: string
  required?: boolean
  error?: string
  hint?: ReactNode
  // Right-aligned text next to the label (e.g. the agenda counter).
  aside?: ReactNode
  children: ReactNode
}

// Label + control + inline error. `min-w-0`: grid/flex items floor at their
// content width, so a native date input would overlap its sibling without it
// (CLAUDE.md §6, AC-WC-35).
export function FormFieldShell({ id, label, required, error, hint, aside, children }: FormFieldShellProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <div className="flex items-center justify-between gap-2">
        <Label htmlFor={id} className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
          {label}
          {required && (
            <span className="text-coach-red-text" aria-hidden>
              {' '}
              *
            </span>
          )}
        </Label>
        {aside}
      </div>
      {children}
      {hint}
      {error && (
        <p id={`${id}-error`} className="text-sm text-destructive">
          {error}
        </p>
      )}
    </div>
  )
}
