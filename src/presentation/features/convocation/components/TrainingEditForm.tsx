import type { ReactNode } from 'react'
import type { UiError } from '@presentation/shared/errors/ui-error'
import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { DateTimeInput } from './DateTimeInput'
import { FIELD_ROW_CLASSNAME } from './field-style'

// Bare `YYYY-MM-DD` / `HH:MM`, combined into the ISO Convocation.date only at
// submit (useConvocationDetailViewModel.onSubmitTraining).
export interface TrainingFormValues {
  date: string
  time: string
}

interface TrainingEditFormProps {
  values: TrainingFormValues
  onChangeDate: (value: string) => void
  onChangeTime: (value: string) => void
  canSubmit: boolean
  isSaving: boolean
  onSubmit: () => void
  onCancel: () => void
  saveError: UiError | null
  // The training started while the form was open: stays mounted with its
  // values intact, only the message and buttons change.
  windowClosed: boolean
  windowClosedMessage: string
}

// Same box as MatchDetailsEditForm's fields, so both edit forms look alike.
const TRAINING_FIELD_BOX =
  'scheme-dark flex h-12 w-full items-center rounded-full border border-white/15 bg-white/5 px-4 text-[15px] font-medium text-white'

function FieldLabel({ children }: { children: ReactNode }) {
  return <span className="text-[11px] font-bold tracking-wide text-white/45 uppercase">{children}</span>
}

// In-place edit of a training's start time (coach only). Venue is not offered:
// changing it is admin-only in the database.
export function TrainingEditForm({
  values,
  onChangeDate,
  onChangeTime,
  canSubmit,
  isSaving,
  onSubmit,
  onCancel,
  saveError,
  windowClosed,
  windowClosedMessage,
}: TrainingEditFormProps) {
  const alertMessage = windowClosed ? windowClosedMessage : (saveError?.message ?? null)

  return (
    <div className="flex flex-col gap-5 py-4">
      <div className="flex flex-col gap-1.5">
        <FieldLabel>Séance</FieldLabel>
        {/* CLAUDE.md §6: each grid item gets min-w-0 so the native date input
            can shrink to its track on a narrow phone. */}
        <div className={FIELD_ROW_CLASSNAME}>
          <div className="min-w-0">
            <DateTimeInput id="trainingDate" type="date" value={values.date} onChange={onChangeDate} className={TRAINING_FIELD_BOX} />
          </div>
          <div className="min-w-0">
            <DateTimeInput id="trainingTime" type="time" value={values.time} onChange={onChangeTime} className={TRAINING_FIELD_BOX} />
          </div>
        </div>
      </div>

      {alertMessage && (
        <Alert variant="destructive">
          <AlertDescription>{alertMessage}</AlertDescription>
        </Alert>
      )}

      <div className="flex gap-3 pt-1">
        <Button
          type="button"
          onClick={onCancel}
          className="h-12 flex-1 rounded-full border-0 bg-white/10 text-white hover:bg-white/15"
        >
          {windowClosed ? 'Fermer' : 'Annuler'}
        </Button>
        <Button
          type="button"
          onClick={onSubmit}
          disabled={!canSubmit || windowClosed}
          className="h-12 flex-1 rounded-full bg-coach-green font-extrabold text-white hover:bg-coach-green/90 disabled:opacity-40"
        >
          {isSaving ? 'Enregistrement…' : 'Enregistrer'}
        </Button>
      </div>
    </div>
  )
}
