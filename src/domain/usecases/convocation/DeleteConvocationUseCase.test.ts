import { describe, expect, it, vi } from 'vitest'
import type { Convocation } from '@domain/entities/convocation'
import { ConvocationNotEditableError } from '@domain/errors/convocation-not-editable-error'
import { NotFoundError } from '@domain/errors/not-found-error'
import type { ConvocationRepository } from '@domain/repositories/convocation-repository'
import { DeleteConvocationUseCase } from './DeleteConvocationUseCase'

const NOW = new Date('2026-08-01T12:00:00.000Z')

function setup(convocation: Partial<Convocation> | null) {
  const remove = vi.fn(async () => undefined)
  const repository = {
    findById: async () => (convocation ? ({ id: 'convocation-1', ...convocation } as Convocation) : null),
    delete: remove,
  } as unknown as ConvocationRepository
  return { useCase: new DeleteConvocationUseCase(repository), remove }
}

describe('DeleteConvocationUseCase', () => {
  it('deletes an open, upcoming convocation', async () => {
    const { useCase, remove } = setup({ date: '2026-08-10T18:00:00.000Z', status: 'open' })
    await useCase.execute({ convocationId: 'convocation-1', now: NOW })
    expect(remove).toHaveBeenCalledWith('convocation-1')
  })

  it('throws NotFoundError when the convocation does not exist', async () => {
    const { useCase, remove } = setup(null)
    await expect(useCase.execute({ convocationId: 'x', now: NOW })).rejects.toBeInstanceOf(NotFoundError)
    expect(remove).not.toHaveBeenCalled()
  })

  it('refuses once the convocation has started', async () => {
    const { useCase, remove } = setup({ date: '2026-07-31T18:00:00.000Z', status: 'open' })
    await expect(useCase.execute({ convocationId: 'convocation-1', now: NOW })).rejects.toBeInstanceOf(ConvocationNotEditableError)
    expect(remove).not.toHaveBeenCalled()
  })

  it('refuses a cancelled convocation', async () => {
    const { useCase } = setup({ date: '2026-08-10T18:00:00.000Z', status: 'cancelled' })
    await expect(useCase.execute({ convocationId: 'convocation-1', now: NOW })).rejects.toBeInstanceOf(ConvocationNotEditableError)
  })
})
