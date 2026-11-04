import type { TrainingRecurrenceFrequency } from '@domain/policies/training-recurrence'

export const REPEAT_FREQUENCY_LABELS: Record<TrainingRecurrenceFrequency, string> = {
  daily: 'Chaque jour',
  weekly: 'Chaque semaine',
  biweekly: 'Toutes les 2 semaines',
}
