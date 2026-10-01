import { IconPlus, IconX } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'
import { Input } from '@presentation/shared/components/ui/input'
import type { ConvocationFormViewModel } from '../useConvocationFormViewModel'
import { FormFieldShell } from './FormFieldShell'

type AgendaEditorProps = {
  vm: Pick<ConvocationFormViewModel, 'values' | 'isSubmitting' | 'agendaDraft' | 'setAgendaDraft' | 'addAgendaPoint' | 'removeAgendaPoint'>
}

// Ordered agenda, add and remove only (no reordering, UI-WC-05). Enter in the
// field adds the point too. A blank point is never added; an empty list is
// valid. The counter reads "Aucun point" / "N point(s)".
export function AgendaEditor({ vm }: AgendaEditorProps) {
  const count = vm.values.agenda.length

  return (
    <FormFieldShell
      id="convocation-agenda"
      label="Ordre du jour"
      aside={<span className="text-xs text-muted-foreground">{count === 0 ? 'Aucun point' : `${count} point${count > 1 ? 's' : ''}`}</span>}
    >
      <div className="flex items-center gap-2">
        <Input
          id="convocation-agenda"
          placeholder="Ajouter un point…"
          value={vm.agendaDraft}
          onChange={(event) => vm.setAgendaDraft(event.target.value)}
          onKeyDown={(event) => {
            if (event.key === 'Enter') {
              event.preventDefault()
              vm.addAgendaPoint()
            }
          }}
          disabled={vm.isSubmitting}
          className="h-11 min-w-0 flex-1 rounded-xl border-dashed"
        />
        <Button
          type="button"
          variant="outline"
          size="icon"
          onClick={vm.addAgendaPoint}
          disabled={vm.isSubmitting}
          aria-label="Ajouter le point"
          className="h-11 w-11 rounded-xl"
        >
          <IconPlus className="size-4" aria-hidden />
        </Button>
      </div>

      {count > 0 && (
        <ol className="flex flex-col gap-2">
          {vm.values.agenda.map((point, index) => (
            // Free strings with no id: index + text is the best available key.
            <li key={`${index}-${point}`} className="flex min-h-11 items-center justify-between gap-2 rounded-xl border border-border px-3">
              <span className="min-w-0 text-sm break-words">
                {index + 1}. {point}
              </span>
              <Button
                type="button"
                variant="ghost"
                size="icon"
                onClick={() => vm.removeAgendaPoint(index)}
                disabled={vm.isSubmitting}
                aria-label={`Retirer le point ${index + 1}`}
                className="h-11 w-11 shrink-0 rounded-full"
              >
                <IconX className="size-4" aria-hidden />
              </Button>
            </li>
          ))}
        </ol>
      )}
    </FormFieldShell>
  )
}
