import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Input } from '@presentation/shared/components/ui/input'
import { cn } from '@presentation/shared/lib/utils'
import { FIELD_CLASSNAME } from '../components/field-style'
import type { AdHocMissionFormView } from './useConvocationMissionsViewModel'

interface AdHocMissionFormProps {
  form: AdHocMissionFormView
}

// "+ Mission ponctuelle" button, replaced in place by the inline form
// (Coach 5 export). Capacity chips: exclusive, `grid-cols-3`, each item
// `min-w-0`, `h-11`; the options come from MIN_/MAX_MISSION_CAPACITY via the
// ViewModel. "Ajouter" is the only disabled control of the feature (a form
// field rule, not a permission).
export function AdHocMissionForm({ form }: AdHocMissionFormProps) {
  if (!form.isOpen) {
    return (
      <Button
        type="button"
        variant="outline"
        onClick={form.onOpen}
        className="h-11 w-full border-dashed border-white/25 bg-transparent text-[13.5px] font-bold text-white hover:bg-white/8 hover:text-white"
      >
        + Mission ponctuelle
      </Button>
    )
  }

  return (
    <form
      onSubmit={(event) => {
        event.preventDefault()
        form.onSubmit()
      }}
      className="flex flex-col gap-3 rounded-[20px] border border-white/10 bg-white/6 p-4"
    >
      <p className="text-[11px] font-extrabold tracking-wider text-white/50 uppercase">Nouvelle mission ponctuelle</p>

      <Input
        aria-label="Libellé"
        value={form.label}
        onChange={(event) => form.onChangeLabel(event.target.value)}
        placeholder="Ex. Installer les barrières"
        className={FIELD_CLASSNAME}
      />

      <div role="group" aria-label="Capacité" className="grid grid-cols-3 gap-2">
        {form.capacityOptions.map((option) => (
          <Button
            key={option}
            type="button"
            variant="outline"
            aria-pressed={form.capacity === option}
            onClick={() => form.onSelectCapacity(option)}
            className={cn(
              'h-11 min-w-0 flex-col gap-0 px-1 text-[12px] leading-tight whitespace-normal text-white hover:text-white',
              form.capacity === option ? 'border-coach-green bg-coach-green/15' : 'border-white/12 bg-white/5 hover:bg-white/10',
            )}
          >
            <span>{option}</span>
            <span>{option > 1 ? 'personnes' : 'personne'}</span>
          </Button>
        ))}
      </div>

      {form.error && (
        <Alert variant="destructive">
          <AlertDescription>{form.error}</AlertDescription>
        </Alert>
      )}

      <div className="grid grid-cols-2 gap-2">
        <Button type="button" variant="secondary" onClick={form.onCancel} disabled={form.isSubmitting} className="h-11 min-w-0">
          Annuler
        </Button>
        <Button type="submit" disabled={!form.canSubmit} className="h-11 min-w-0 bg-coach-green text-white hover:bg-coach-green/80">
          {form.isSubmitting ? 'Ajout…' : 'Ajouter'}
        </Button>
      </div>
    </form>
  )
}
