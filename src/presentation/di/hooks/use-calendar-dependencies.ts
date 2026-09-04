import { useDomainDependencies } from './use-domain-dependencies'

export function useCalendarDependencies() {
  return useDomainDependencies('Calendar', (container) => container.calendar)
}
