import { useDomainDependencies } from './use-domain-dependencies'

export function useMissionTemplatesDependencies() {
  return useDomainDependencies('MissionTemplates', (container) => container.missionTemplates)
}
