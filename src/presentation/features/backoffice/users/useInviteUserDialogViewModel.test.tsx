import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { InvalidUserInputError } from '@domain/errors/invalid-user-input-error'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { INVITE_LINK_VALIDITY_HOURS } from './invitation-message'
import { type InviteUserDialogTarget, useInviteUserDialogViewModel } from './useInviteUserDialogViewModel'

vi.mock('@presentation/di/hooks/use-users-dependencies')
vi.mock('@presentation/shared/hooks/use-auth')

const mockedUseUsersDependencies = vi.mocked(useUsersDependencies)
const mockedUseAuth = vi.mocked(useAuth)

function renderViewModel({
  target,
  invite = vi.fn().mockResolvedValue({ url: 'https://app.example.com/activation?token_hash=abc&type=invite' }),
  reissueInvitationLink = vi.fn().mockResolvedValue({ url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink' }),
}: {
  target: InviteUserDialogTarget
  invite?: ReturnType<typeof vi.fn>
  reissueInvitationLink?: ReturnType<typeof vi.fn>
}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.test', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: new Date() },
    isLoading: false,
    refreshUser: vi.fn(),
  } as never)
  mockedUseUsersDependencies.mockReturnValue({
    inviteUserUseCase: { execute: invite },
    reissueInvitationLinkUseCase: { execute: reissueInvitationLink },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const onClose = vi.fn()
  const rendered = renderHook(() => useInviteUserDialogViewModel({ target, onClose }), { wrapper })
  return { ...rendered, onClose, invite, reissueInvitationLink }
}

describe('useInviteUserDialogViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  it('cannot submit the create form until both fields are filled', () => {
    const { result } = renderViewModel({ target: { mode: 'create' } })
    expect(result.current.canSubmit).toBe(false)

    act(() => result.current.setFullName('Nouveau membre'))
    expect(result.current.canSubmit).toBe(false)

    act(() => result.current.setEmail('nouveau@example.test'))
    expect(result.current.canSubmit).toBe(true)
  })

  it('create mode calls InviteUserUseCase and builds the message from the resulting link', async () => {
    const invite = vi.fn().mockResolvedValue({ url: 'https://app.example.com/activation?token_hash=abc&type=invite' })
    const { result } = renderViewModel({ target: { mode: 'create' }, invite })

    act(() => result.current.setFullName('Nouveau Membre'))
    act(() => result.current.setEmail('nouveau@example.test'))
    act(() => result.current.generate())

    await waitFor(() => expect(result.current.link).not.toBeNull())
    expect(invite).toHaveBeenCalledWith({ actorId: 'admin-1', fullName: 'Nouveau Membre', email: 'nouveau@example.test' })
    expect(result.current.message).toContain('Bonjour Nouveau 👋')
    expect(result.current.message).toContain('https://app.example.com/activation?token_hash=abc&type=invite')
    expect(result.current.message).toContain(`valable ${INVITE_LINK_VALIDITY_HOURS} h`)
  })

  it('reissue mode calls ReissueInvitationLinkUseCase with the target user id, no form required', async () => {
    const reissueInvitationLink = vi.fn().mockResolvedValue({ url: 'https://app.example.com/activation?token_hash=xyz&type=magiclink' })
    const target: InviteUserDialogTarget = { mode: 'reissue', userId: 'member-1', fullName: 'Membre Invité' }
    const { result } = renderViewModel({ target, reissueInvitationLink })

    expect(result.current.canSubmit).toBe(true)

    act(() => result.current.generate())

    await waitFor(() => expect(result.current.link).not.toBeNull())
    expect(reissueInvitationLink).toHaveBeenCalledWith({ actorId: 'admin-1', targetUserId: 'member-1' })
    expect(result.current.message).toContain('Bonjour Membre 👋')
  })

  it('surfaces a domain error from the use case as a French message', async () => {
    const invite = vi.fn().mockRejectedValue(new InvalidUserInputError('missing fields'))
    const { result } = renderViewModel({ target: { mode: 'create' }, invite })

    act(() => result.current.setFullName('Nouveau Membre'))
    act(() => result.current.setEmail('nouveau@example.test'))
    act(() => result.current.generate())

    await waitFor(() => expect(result.current.generateErrorMessage).not.toBeNull())
    expect(result.current.link).toBeNull()
  })

  describe('clipboard', () => {
    const originalClipboard = navigator.clipboard

    afterEach(() => {
      Object.defineProperty(navigator, 'clipboard', { value: originalClipboard, configurable: true })
    })

    it('shows a copied confirmation on a successful clipboard write', async () => {
      const writeText = vi.fn().mockResolvedValue(undefined)
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

      const { result } = renderViewModel({ target: { mode: 'create' } })
      act(() => result.current.setFullName('Nouveau Membre'))
      act(() => result.current.setEmail('nouveau@example.test'))
      act(() => result.current.generate())
      await waitFor(() => expect(result.current.link).not.toBeNull())

      await act(() => result.current.copyMessage())

      expect(writeText).toHaveBeenCalledWith(result.current.message)
      expect(result.current.copyState).toBe('copied')
      expect(result.current.clipboardError).toBeNull()
    })

    it('keeps the message visible and shows an inline error when the clipboard write rejects', async () => {
      const writeText = vi.fn().mockRejectedValue(new Error('denied'))
      Object.defineProperty(navigator, 'clipboard', { value: { writeText }, configurable: true })

      const { result } = renderViewModel({ target: { mode: 'create' } })
      act(() => result.current.setFullName('Nouveau Membre'))
      act(() => result.current.setEmail('nouveau@example.test'))
      act(() => result.current.generate())
      await waitFor(() => expect(result.current.link).not.toBeNull())

      await act(() => result.current.copyMessage())

      expect(result.current.clipboardError).not.toBeNull()
      expect(result.current.message).not.toBeNull()
    })
  })
})
