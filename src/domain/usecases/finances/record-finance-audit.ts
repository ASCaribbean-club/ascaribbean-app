import type { AuditLogRepository, RecordAuditLogEntryInput } from '../../repositories/audit-log-repository'

// specs/mob-treasurer-finances-edit.md §4 — audit emission shared by the
// correction use cases. Called AFTER the write has committed. A failure of the
// audit write is caught and logged only, like RecordExpenseUseCase (no shared
// transaction between the write and the SECURITY DEFINER audit RPC): for a
// DELETION this means the row can vanish with no trace — inherited gap,
// PO-FIE-09 / PO-TR-19, flagged and NOT resolved here.
export async function recordFinanceAudit(
  auditLogRepository: AuditLogRepository,
  entry: RecordAuditLogEntryInput,
  context: { useCase: string; actorId: string },
): Promise<void> {
  try {
    await auditLogRepository.record(entry)
  } catch (auditError) {
    console.error(`${context.useCase}: failed to record ${entry.action} audit entry`, {
      actorId: context.actorId,
      targetId: entry.targetId,
      auditError,
    })
  }
}
