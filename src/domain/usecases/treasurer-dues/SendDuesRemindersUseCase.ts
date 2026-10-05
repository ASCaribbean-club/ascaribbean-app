import type { DuesReminderResult } from '../../entities/dues-reminder'
import { ForbiddenError } from '../../errors/forbidden-error'
import { InvalidDuesReminderInputError } from '../../errors/invalid-dues-reminder-input-error'
import { can } from '../../policies/can'
import type { AuditLogRepository } from '../../repositories/audit-log-repository'
import type { DuesReminderRepository } from '../../repositories/dues-reminder-repository'
import type { UserRepository } from '../../repositories/user-repository'
import { MAX_REMINDER_BATCH_SIZE } from '../../rules/dues-reminder-rules'

export interface SendDuesRemindersInput {
  actorId: string
  // A single reminder is a batch of 1.
  membershipIds: string[]
}

export interface SendDuesRemindersSummary {
  results: DuesReminderResult[]
  sentCount: number
  // Refused server-side: settled meanwhile, reminded less than 7 days ago, or
  // no longer in the current season.
  notSentCount: number
}

// specs/mobile-treasurer.md amendement (4), §B/§E — the Treasurer reminds
// members who still owe a balance. 'dues:remind' is checked here for a clean
// error; the real boundary is send_dues_reminders() (role check, eligibility
// and 7-day window reapplied, atomic).
//
// Business action => the audit entry 'dues.reminder_sent' is written from
// HERE (CLAUDE.md §6), never from the SQL function or a component: one entry
// per reminder EFFECTIVELY sent (outcome 'sent'), none for a refused one.
// Metadata is minimal: no amount, no name (data minimisation).
//
// Same inherited gap as RecordPaymentUseCase: the reminders are committed by
// the RPC before the audit calls, with no shared transaction. A failed audit
// write is caught and sent to console.error, never rejecting this use case —
// the business outcome (the reminder was sent) already succeeded. Watch
// /admin/audit (PO-TR-19).
export class SendDuesRemindersUseCase {
  constructor(
    private readonly userRepository: UserRepository,
    private readonly duesReminderRepository: DuesReminderRepository,
    private readonly auditLogRepository: AuditLogRepository,
  ) {}

  async execute(input: SendDuesRemindersInput): Promise<SendDuesRemindersSummary> {
    const user = await this.userRepository.findById(input.actorId)
    if (!user) {
      throw new ForbiddenError(`User not found: ${input.actorId}`)
    }
    if (!can(user, 'dues:remind')) {
      throw new ForbiddenError(`User ${input.actorId} is not authorized to send dues reminders`)
    }

    const membershipIds = [...new Set(input.membershipIds)]
    if (membershipIds.length === 0) {
      throw new InvalidDuesReminderInputError('At least one membership is required')
    }
    if (membershipIds.length > MAX_REMINDER_BATCH_SIZE) {
      throw new InvalidDuesReminderInputError(`At most ${MAX_REMINDER_BATCH_SIZE} memberships per call`)
    }

    const results = await this.duesReminderRepository.send(membershipIds)
    const sent = results.filter((result) => result.outcome === 'sent')

    const mode = membershipIds.length === 1 ? 'single' : 'bulk'
    await Promise.all(
      sent.map(async (result) => {
        try {
          await this.auditLogRepository.record({
            action: 'dues.reminder_sent',
            targetId: result.membershipId,
            targetType: 'membership',
            metadata: { mode, batch_size: membershipIds.length },
          })
        } catch (auditError) {
          console.error('SendDuesRemindersUseCase: failed to record dues.reminder_sent audit entry', {
            actorId: input.actorId,
            targetId: result.membershipId,
            auditError,
          })
        }
      }),
    )

    return { results, sentCount: sent.length, notSentCount: results.length - sent.length }
  }
}
