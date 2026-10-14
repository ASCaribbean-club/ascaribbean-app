import type { Convocation } from '@domain/entities/convocation'
import { toLocalIsoDate } from '@domain/policies/availability'

// Les deux seules propriétés de convocation autorisées dans les événements.
export function toConvocationAnalytics(convocation: Pick<Convocation, 'type' | 'date'>) {
  return { convocation_type: convocation.type, convocation_date: toLocalIsoDate(new Date(convocation.date)) }
}
