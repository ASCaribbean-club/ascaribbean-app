import { describe, expect, it, vi } from 'vitest'
import type { AuthRepository } from '../../repositories/auth-repository'
import { CheckRecoveryLinkUseCase } from './CheckRecoveryLinkUseCase'

describe('CheckRecoveryLinkUseCase', () => {
  it('delegates to AuthRepository.hasRecoveryLinkError', () => {
    const hasRecoveryLinkError = vi.fn().mockReturnValue(true)
    const authRepository = { hasRecoveryLinkError } as unknown as AuthRepository

    const result = new CheckRecoveryLinkUseCase(authRepository).execute()

    expect(result).toBe(true)
    expect(hasRecoveryLinkError).toHaveBeenCalledOnce()
  })
})
