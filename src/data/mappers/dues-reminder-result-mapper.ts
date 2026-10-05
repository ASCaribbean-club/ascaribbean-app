import { isDuesReminderOutcome, type DuesReminderResult } from '@domain/entities/dues-reminder'
import type { DuesReminderResultDto } from '../dto/dues-reminder-result-dto'

// An outcome this client does not know (the SQL function widened ahead of the
// front-end) is read as 'not_found': it is never counted as sent, so no audit
// entry is emitted for it and the UI reports it as "non envoyée".
export function toDuesReminderResult(dto: DuesReminderResultDto): DuesReminderResult {
  return {
    membershipId: dto.membership_id,
    outcome: isDuesReminderOutcome(dto.outcome) ? dto.outcome : 'not_found',
  }
}
