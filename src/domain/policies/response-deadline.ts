import type { Convocation, ConvocationType } from '../entities/convocation'

const RESPONSE_DEADLINE_MINUTES: Record<ConvocationType, number> = {
  training: 10,
  match: 60,
  meeting: 60, // OPEN — placeholder value, not confirmed by the developer yet. Flag in code review.
}

export function canPlayerRespond(convocation: Convocation, now: Date): boolean {
  const deadline = new Date(convocation.date)
  deadline.setMinutes(deadline.getMinutes() - RESPONSE_DEADLINE_MINUTES[convocation.type])
  return now < deadline
}
