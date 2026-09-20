import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { AssignableRoleAssignment } from '@domain/entities/user'
import { DuplicateRoleAssignmentError } from '@domain/errors/duplicate-role-assignment-error'
import type { AdminUserDirectoryEntry } from '@domain/repositories/user-repository'
import { useUsersDependencies } from '@presentation/di/hooks/use-users-dependencies'
import { useAuth } from '@presentation/shared/hooks/use-auth'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useEditRoleAssignmentDialogViewModel } from './useEditRoleAssignmentDialogViewModel'

// specs/web-users-role-edit-remove.md §2.2 rule 3/§2.2 rule 4/AC-WU-51 — the
// real derived logic this ViewModel owns (CLAUDE.md §8 carve-out): the
// no-op short-circuit (a submission identical to the current scope must
// never call the mutation at all) and translating a repository conflict
// into the French copy the dialog shows. Everything else is DI/query
// wiring already covered, in shape, by useAssignRoleDialogViewModel/
// useBackofficeUsersViewModel's own tests.

vi.mock('@presentation/di/hooks/use-users-dependencies')
vi.mock('@presentation/shared/hooks/use-auth')
vi.mock('@presentation/shared/hooks/use-permission')

const mockedUseUsersDependencies = vi.mocked(useUsersDependencies)
const mockedUseAuth = vi.mocked(useAuth)
const mockedUsePermission = vi.mocked(usePermission)

function buildTarget(overrides: Partial<AdminUserDirectoryEntry> = {}): AdminUserDirectoryEntry {
  return {
    id: 'target-1',
    fullName: 'Joueur Un',
    email: 'joueur-un@example.test',
    charterAcceptedAt: new Date('2026-01-01T00:00:00.000Z'),
    roles: [{ role: 'player', teamId: 'team-1' }],
    missingElementFacts: { hasRole: true, hasMembershipForCurrentSeason: true, hasLicenceNumberForCurrentSeason: true, charterAccepted: true },
    ...overrides,
  }
}

function renderViewModel({
  target,
  assignment,
  editRoleAssignmentScope = vi.fn().mockResolvedValue(undefined),
  removeRoleAssignment = vi.fn().mockResolvedValue(undefined),
  canRemoveRole = true,
}: {
  target: AdminUserDirectoryEntry
  assignment: AssignableRoleAssignment
  editRoleAssignmentScope?: ReturnType<typeof vi.fn>
  removeRoleAssignment?: ReturnType<typeof vi.fn>
  canRemoveRole?: boolean
}) {
  mockedUseAuth.mockReturnValue({
    user: { id: 'admin-1', fullName: 'Administrateur', email: 'admin@example.test', roles: [{ role: 'admin' }], position: null, charterAcceptedAt: new Date() },
    isLoading: false,
    refreshUser: vi.fn(),
  } as never)
  mockedUsePermission.mockImplementation((action) => (action === 'role:remove' ? canRemoveRole : false))
  mockedUseUsersDependencies.mockReturnValue({
    editRoleAssignmentScopeUseCase: { execute: editRoleAssignmentScope },
    removeRoleAssignmentUseCase: { execute: removeRoleAssignment },
    teamRepository: { findAllForAdmin: vi.fn().mockResolvedValue([]) },
    sectionRepository: { findAll: vi.fn().mockResolvedValue([]) },
    seasonRepository: { findAll: vi.fn().mockResolvedValue([]) },
  } as never)

  const queryClient = new QueryClient({ defaultOptions: { queries: { retry: false } } })
  const wrapper = ({ children }: { children: React.ReactNode }) => <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>
  const onClose = vi.fn()
  const rendered = renderHook(() => useEditRoleAssignmentDialogViewModel({ target, assignment, onClose }), { wrapper })
  return { ...rendered, onClose, editRoleAssignmentScope, removeRoleAssignment }
}

describe('useEditRoleAssignmentDialogViewModel', () => {
  beforeEach(() => {
    vi.clearAllMocks()
  })

  // §2.2 rule 3/AC-WU-51 — "une soumission identique à l'état actuel est un
  // no-op silencieux": submitting the SAME team a player already holds must
  // close the dialog WITHOUT calling the use case at all.
  it('submitting an unchanged player scope closes silently without calling the use case', async () => {
    const target = buildTarget({ roles: [{ role: 'player', teamId: 'team-1' }] })
    const { result, onClose, editRoleAssignmentScope } = renderViewModel({
      target,
      assignment: { role: 'player', teamId: 'team-1' },
    })

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.submit())

    expect(editRoleAssignmentScope).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  it('submitting a changed player scope calls the use case with current and next assignments', async () => {
    const target = buildTarget({ roles: [{ role: 'player', teamId: 'team-1' }] })
    const { result, editRoleAssignmentScope } = renderViewModel({
      target,
      assignment: { role: 'player', teamId: 'team-1' },
    })

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.setTeamId('team-2'))
    act(() => result.current.submit())

    await waitFor(() => expect(editRoleAssignmentScope).toHaveBeenCalledTimes(1))
    expect(editRoleAssignmentScope).toHaveBeenCalledWith({
      actorId: 'admin-1',
      userId: 'target-1',
      currentAssignment: { role: 'player', teamId: 'team-1' },
      nextAssignment: { role: 'player', teamId: 'team-2' },
    })
  })

  // §2.2 rule 3 — same no-op rule for 'coach', order-independent: checking
  // the SAME set of teams (regardless of click order) must still be a
  // no-op, not a false positive "changed" submission.
  it('submitting the same set of coach teams (different tick order) is still a no-op', async () => {
    const target = buildTarget({ roles: [{ role: 'coach', teamIds: ['team-1', 'team-2'] }] })
    const { result, onClose, editRoleAssignmentScope } = renderViewModel({
      target,
      assignment: { role: 'coach', teamIds: ['team-1', 'team-2'] },
    })

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    // Toggle team-1 off then back on — ends up at the SAME set, different
    // insertion order than the initial pre-checked state.
    act(() => result.current.toggleTeam('team-1'))
    act(() => result.current.toggleTeam('team-1'))
    act(() => result.current.submit())

    expect(editRoleAssignmentScope).not.toHaveBeenCalled()
    expect(onClose).toHaveBeenCalledTimes(1)
  })

  // §2.2 rule 4/AC-WU-51 — a scope-edit conflict is a translated French
  // message, never absorbed in silence.
  it('surfaces DuplicateRoleAssignmentError as a French error message', async () => {
    const target = buildTarget({ roles: [{ role: 'player', teamId: 'team-1' }] })
    const editRoleAssignmentScope = vi.fn().mockRejectedValue(new DuplicateRoleAssignmentError('duplicate'))
    const { result } = renderViewModel({
      target,
      assignment: { role: 'player', teamId: 'team-1' },
      editRoleAssignmentScope,
    })

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.setTeamId('team-2'))
    act(() => result.current.submit())

    await waitFor(() => expect(result.current.errorMessage).toBe('Ce compte porte déjà ce rôle sur cette équipe ou cette section.'))
  })

  // AC-WU-53 — canRemoveRole is a SEPARATE boolean, reflecting exactly what
  // usePermission('role:remove', ...) says, never derived from canAssignRole.
  it('exposes canRemoveRole from the role:remove permission', async () => {
    const target = buildTarget()
    const { result } = renderViewModel({ target, assignment: { role: 'player', teamId: 'team-1' }, canRemoveRole: false })

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))
    expect(result.current.canRemoveRole).toBe(false)
  })

  // §7 of the amendment — the destructive action is a SECOND step: opening
  // the confirmation must never call removeRoleAssignmentUseCase by itself.
  it('opening the removal confirmation does not call the use case until confirmed', async () => {
    const target = buildTarget()
    const { result, removeRoleAssignment } = renderViewModel({ target, assignment: { role: 'player', teamId: 'team-1' } })

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.openRemoveConfirmation())
    expect(result.current.isConfirmingRemoval).toBe(true)
    expect(removeRoleAssignment).not.toHaveBeenCalled()

    act(() => result.current.confirmRemoval())
    await waitFor(() => expect(removeRoleAssignment).toHaveBeenCalledTimes(1))
    expect(removeRoleAssignment).toHaveBeenCalledWith({ actorId: 'admin-1', userId: 'target-1', assignment: { role: 'player', teamId: 'team-1' } })
  })

  // §"En cas de succès" — a successful removal closes BOTH the confirmation
  // and the edit dialog it was opened from.
  it('closes both dialogs on a successful removal', async () => {
    const target = buildTarget()
    const { result, onClose } = renderViewModel({ target, assignment: { role: 'player', teamId: 'team-1' } })

    await waitFor(() => expect(result.current.isLoadingOptions).toBe(false))

    act(() => result.current.openRemoveConfirmation())
    act(() => result.current.confirmRemoval())

    await waitFor(() => expect(result.current.isConfirmingRemoval).toBe(false))
    expect(onClose).toHaveBeenCalledTimes(1)
  })
})
