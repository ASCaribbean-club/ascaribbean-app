import { useDomainDependencies } from './use-domain-dependencies'

export function useAuditLogDependencies() {
  return useDomainDependencies('AuditLog', (container) => container.auditLog)
}
