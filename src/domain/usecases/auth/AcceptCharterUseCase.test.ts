import { describe, expect, it, vi } from 'vitest'
import type { UserRepository } from '../../repositories/user-repository'
import { AcceptCharterUseCase } from './AcceptCharterUseCase'

describe('AcceptCharterUseCase', () => {
  it('delegates to UserRepository.acceptCharter with the given userId', async () => {
    const acceptCharter = vi.fn().mockResolvedValue(undefined)
    const userRepository = { acceptCharter } as unknown as UserRepository

    await new AcceptCharterUseCase(userRepository).execute({ userId: 'u1' })

    expect(acceptCharter).toHaveBeenCalledWith('u1')
  })
})
