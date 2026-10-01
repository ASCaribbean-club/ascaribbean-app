import { useDomainDependencies } from './use-domain-dependencies'

export function useTrainingLocationsDependencies() {
  return useDomainDependencies('TrainingLocations', (container) => container.trainingLocations)
}
