import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import { isConvocationEditable } from '@domain/policies/convocation-admin-windows'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'

export interface DeleteConvocationInput {
  convocationId: string
  // Passed in, never `new Date()` here (same convention as UpdateMatchDetailsUseCase).
  now: Date
}

// A coach deleting a convocation that hasn't started yet. Like the update use
// cases, it does not call `can()`: the render gate is
// usePermission('convocation:delete') and the real gate is the RLS policy
// convocations_delete_coach (same `date > now() and status = 'open'` window).
export class DeleteConvocationUseCase {
  constructor(private readonly convocationRepository: ConvocationRepository) {}

  async execute(input: DeleteConvocationInput): Promise<void> {
    const convocation = await this.convocationRepository.findById(input.convocationId)
    if (!convocation) {
      throw new NotFoundError(`Convocation ${input.convocationId} not found.`)
    }
    if (!isConvocationEditable(convocation, input.now)) {
      throw new ConvocationNotEditableError(`Convocation ${input.convocationId} is past or no longer open.`)
    }
    await this.convocationRepository.delete(input.convocationId)
  }
}
