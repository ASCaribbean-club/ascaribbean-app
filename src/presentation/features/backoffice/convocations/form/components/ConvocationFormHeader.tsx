import { IconArrowLeft } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'

interface ConvocationFormHeaderProps {
  title: string
  subtitle?: string
  backLabel: string
  onBack: () => void
}

// Screen-level back header — `sticky top-0` with an OPAQUE background so the
// back control stays reachable while a tall form scrolls (CLAUDE.md §6).
// Shared by the form and attendance screens.
export function ConvocationFormHeader({ title, subtitle, backLabel, onBack }: ConvocationFormHeaderProps) {
  return (
    <header className="sticky top-0 z-10 flex items-center gap-3 bg-background py-3">
      <Button type="button" variant="outline" size="icon" onClick={onBack} aria-label={backLabel} className="h-11 w-11 rounded-full">
        <IconArrowLeft className="size-5" aria-hidden />
      </Button>
      <div className="flex min-w-0 flex-col">
        <h2 className="text-xl font-bold text-foreground">{title}</h2>
        {subtitle && <p className="text-sm text-muted-foreground">{subtitle}</p>}
      </div>
    </header>
  )
}
