import type { Convocation } from '@domain/entities/convocation'
import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { InvalidConvocationInputError } from '@domain/errors/invalid-convocation-input-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { isConvocationEditable } from '@domain/policies/convocation-admin-windows'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import { isPastDate } from '@domain/rules/convocation-rules'

export interface UpdateTrainingScheduleInput {
  convocationId: string
  date: string // ISO — new start time
  // Passed in, never `new Date()` here (same convention as UpdateMatchDetailsUseCase).
  now: Date
}

// A coach moving a training's start time before it begins. Like
// UpdateMatchDetailsUseCase, it does not call `can()`: the render gate is
// usePermission('convocation:update') and the real gate is the coach RLS
// policy convocations_update_arrangements. The venue is deliberately not
// editable here — it stays admin-only (convocations_guard_training_location_admin_only).
export class UpdateTrainingScheduleUseCase {
  constructor(private readonly convocationRepository: ConvocationRepository) {}

  async execute(input: UpdateTrainingScheduleInput): Promise<Convocation> {
    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }
    if (convocation.type !== 'training') {
      throw new NotFoundError(`Convocation ${input.convocationId} is not a training convocation.`)
    }

    // Window checked against the ORIGINAL date, at the instant of the write.
    if (!isConvocationEditable(convocation, input.now)) {
      throw new ConvocationNotEditableError(`Convocation ${input.convocationId} is past or no longer open.`)
    }
    if (isPastDate(input.date, input.now)) {
      throw new InvalidConvocationInputError(`The new date is in the past: ${input.date}`)
    }

    return this.convocationRepository.updateDate(input.convocationId, input.date)
  }
}
