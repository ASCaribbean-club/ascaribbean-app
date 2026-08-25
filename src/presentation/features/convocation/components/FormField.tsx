import type { ReactNode } from 'react'
import { Label } from '../../../shared/components/ui/label'

interface FormFieldProps {
  label: string
  htmlFor: string
  error?: string
  children: ReactNode
}

// Generic "label above field, optional red helper text below" wrapper —
// every field on this screen (Input or Select) is wrapped in one of these,
// so the error-state visual pattern (UI design §"Structure de l'écran",
// point 5: "bordure rouge + texte d'aide rouge sous le champ") only needs
// implementing once. The red border itself lives on the field (Input/Select
// already support `aria-invalid` styling out of the box — see
// shared/components/ui/input.tsx's `aria-invalid:border-destructive`), so
// this wrapper only needs to set `aria-invalid` on demand and render the text.
// `min-w-0`: this is also the grid item whenever two of these sit side by
// side (Date/Heure, RDV — heure/lieu — CreateConvocationForm's
// FIELD_ROW_CLASSNAME rows). Grid items default to `min-width: auto`, which
// floors their size at the child's intrinsic content width, so without this
// the field refuses to shrink to its track (CLAUDE.md §6, "Mobile touch
// targets and side-by-side fields"). A native date/time `<input>` needs more
// than that — see DateTimeInput.tsx, which owns its own display and doesn't
// rely on this wrapper clipping anything (an earlier `overflow-hidden` here
// clipped the field's own right border on real Safari, not just overflow —
// reverted).
export function FormField({ label, htmlFor, error, children }: FormFieldProps) {
  return (
    <div className="flex min-w-0 flex-col gap-1.5">
      <Label htmlFor={htmlFor} className="text-[13px] font-bold text-white/70">
        {label}
      </Label>
      {children}
      {error && (
        <p role="alert" className="text-[12px] font-semibold text-coach-red-text">
          {error}
        </p>
      )}
    </div>
  )
}
