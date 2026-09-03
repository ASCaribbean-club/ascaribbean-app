import { describe, expect, it, vi } from 'vitest'
import type { User } from '../../entities/user'
import type { UserRepository } from '../../repositories/user-repository'
import { GetCurrentUserUseCase } from './GetCurrentUserUseCase'

describe('GetCurrentUserUseCase', () => {
  it('returns the user found by UserRepository.findById', async () => {
    const user: User = {
      id: 'u1',
      fullName: 'Test User',
      email: 't@example.com',
      roles: [],
      position: null,
      charterAcceptedAt: null,
    }
    const findById = vi.fn().mockResolvedValue(user)
    const userRepository = { findById } as unknown as UserRepository

    const result = await new GetCurrentUserUseCase(userRepository).execute({ userId: 'u1' })

    expect(findById).toHaveBeenCalledWith('u1')
    expect(result).toBe(user)
  })

  it('returns null when no profile row exists for the session user', async () => {
    const findById = vi.fn().mockResolvedValue(null)
    const userRepository = { findById } as unknown as UserRepository

    const result = await new GetCurrentUserUseCase(userRepository).execute({ userId: 'u1' })

    expect(result).toBeNull()
  })
})
