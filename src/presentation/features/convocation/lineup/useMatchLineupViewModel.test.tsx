import { QueryClient, QueryClientProvider } from '@tanstack/react-query'
import { act, renderHook, waitFor } from '@testing-library/react'
import type { ReactNode } from 'react'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import type { MatchLineup } from '@domain/entities/match-lineup'
import { usePermission } from '@presentation/shared/hooks/use-permission'
import { useConvocationDependencies } from '@presentation/di/hooks/use-convocation-dependencies'
import { useMatchLineupViewModel } from './useMatchLineupViewModel'

vi.mock('@presentation/shared/hooks/use-permission')
vi.mock('@presentation/di/hooks/use-convocation-dependencies')

const KICKOFF = '2026-10-10T15:00:00.000Z'

const savedLineup: MatchLineup = {
  convocationId: 'c1',
  formation: '4-4-2',
  placements: [
    { slotIndex: 0, userId: 'a', displayName: 'Player A', jerseyNumber: 1 },
    { slotIndex: 1, userId: 'b', displayName: 'Player B', jerseyNumber: null },
  ],
}

const save = vi.fn(async () => true)

function setup(overrides: Partial<Parameters<typeof useMatchLineupViewModel>[0]> = {}, lineup: MatchLineup | null = savedLineup) {
  vi.mocked(usePermission).mockReturnValue(true)
  vi.mocked(useConvocationDependencies).mockReturnValue({
    getMatchLineupUseCase: { execute: async () => lineup },
    saveMatchLineupUseCase: { execute: save },
    listLineupDefaultJerseyNumbersUseCase: { execute: async () => ({ c: 17 }) },
    listConvocationRespondersUseCase: {
      execute: async () =>
        ['a', 'b', 'c'].map((id) => ({ userId: id, hasResponded: false, displayName: `Player ${id.toUpperCase()}`, position: null })),
    },
  } as unknown as ReturnType<typeof useConvocationDependencies>)

  const wrapper = ({ children }: { children: ReactNode }) => (
    <QueryClientProvider client={new QueryClient({ defaultOptions: { queries: { retry: false } } })}>{children}</QueryClientProvider>
  )
  return renderHook(
    () =>
      useMatchLineupViewModel({
        convocationId: 'c1',
        teamId: 't1',
        convocationType: 'match',
        kickoff: KICKOFF,
        sectionType: 'football',
        activeRole: 'coach',
        roleMatchesConvocationTeam: true,
        isTabActive: true,
        now: new Date('2026-10-10T10:00:00.000Z'),
        onLeave: vi.fn(),
        ...overrides,
      }),
    { wrapper },
  )
}

describe('useMatchLineupViewModel', () => {
  beforeEach(() => save.mockClear())

  it('hides the tab for a training or a non-football section (AC-MC-01)', () => {
    expect(setup({ convocationType: 'training' }).result.current.isTabAvailable).toBe(false)
    expect(setup({ sectionType: 'esport' }).result.current.isTabAvailable).toBe(false)
  })

  it('shows a player the waiting message with the computed opening time before the window (AC-MC-10)', () => {
    const { result } = setup({ activeRole: 'player', now: new Date('2026-10-09T10:00:00.000Z') })
    expect(result.current.status).toBe('waiting')
    expect(result.current.waitingMessage).toMatch(/^La composition sera disponible le .+ à \d{2}:\d{2}, 24 h avant le coup d’envoi\.$/)
    expect(result.current.canEdit).toBe(false)
  })

  it('lets a player read once the window has opened, without edit control (AC-MC-11)', async () => {
    const { result } = setup({ activeRole: 'player', now: new Date('2026-10-09T16:00:00.000Z') })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.canEdit).toBe(false)
    expect(result.current.title).toBe('COMPOSITION — 4-4-2')
  })

  it('lets the coach read before the RDV (PO-MC-02, AC-MC-23)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    expect(result.current.canEdit).toBe(true)
  })

  it('shows the explicit empty state when no lineup exists (AC-MC-14)', async () => {
    const { result } = setup({}, null)
    await waitFor(() => expect(result.current.status).toBe('empty'))
  })

  it('starts a first composition on 4-3-3 with eleven free slots', async () => {
    const { result } = setup({}, null)
    await waitFor(() => expect(result.current.status).toBe('empty'))
    act(() => result.current.onStartEditing())
    expect(result.current.formation).toBe('4-3-3')
    expect(result.current.slots.every((slot) => slot.userId === null)).toBe(true)
    expect(result.current.bannerText).toBe('Composition incomplète : 11 poste(s) à pourvoir.')
  })

  it('swaps two players and keeps the formation change from removing anyone (AC-MC-04/05)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectFormation('3-5-2'))
    expect(result.current.slots.filter((slot) => slot.userId).length).toBe(2)

    act(() => result.current.onSelectSlot(0))
    act(() => result.current.onToggleSwap())
    expect(result.current.bannerText).toBe('Touchez un autre joueur pour échanger les positions.')
    act(() => result.current.onSelectSlot(1))

    expect(result.current.slots[0].userId).toBe('b')
    expect(result.current.slots[1].userId).toBe('a')
    expect(result.current.panel).toBeNull()
  })

  it('offers only convoked players off the field in Remplacer, and replaces (AC-MC-06)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    await waitFor(() => expect(result.current.canEdit).toBe(true))
    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectSlot(0))
    act(() => result.current.onToggleReplace())
    await waitFor(() => expect(result.current.panel?.availablePlayers).toEqual([{ userId: 'c', displayName: 'Player C' }]))

    act(() => result.current.onPickPlayer('c'))
    expect(result.current.slots[0].userId).toBe('c')
    expect(result.current.slots.some((slot) => slot.userId === 'a')).toBe(false)
  })

  it('saves on Terminé when changed, and skips the call when nothing changed (AC-MC-08)', async () => {
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.onDone())
    expect(save).not.toHaveBeenCalled()
    expect(result.current.isEditing).toBe(false)

    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectFormation('4-3-3'))
    act(() => result.current.onDone())
    await waitFor(() => expect(save).toHaveBeenCalledOnce())
    await waitFor(() => expect(result.current.isEditing).toBe(false))
  })

  it('keeps the edit mode open and the draft when saving fails', async () => {
    save.mockRejectedValueOnce(new Error('boom'))
    const { result } = setup()
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.onSelectFormation('4-3-3'))
    act(() => result.current.onDone())
    await waitFor(() => expect(result.current.saveError).toBe('Enregistrement impossible. Réessayez.'))
    expect(result.current.isEditing).toBe(true)
    expect(result.current.formation).toBe('4-3-3')
  })

  it('asks for confirmation before leaving with unsaved changes', async () => {
    const onLeave = vi.fn()
    const { result } = setup({ onLeave })
    await waitFor(() => expect(result.current.status).toBe('ready'))
    act(() => result.current.onStartEditing())
    act(() => result.current.requestLeave())
    expect(onLeave).toHaveBeenCalledOnce() // nothing changed yet -> no dialog

    act(() => result.current.onSelectFormation('4-3-3'))
    act(() => result.current.requestLeave())
    expect(result.current.isLeavePending).toBe(true)
    expect(onLeave).toHaveBeenCalledOnce()
    act(() => result.current.confirmLeave())
    expect(onLeave).toHaveBeenCalledTimes(2)
  })

  describe('jersey numbers (AC-MC-25..29)', () => {
    async function startEditing() {
      const hook = setup()
      await waitFor(() => expect(hook.result.current.status).toBe('ready'))
      await waitFor(() => expect(hook.result.current.canEdit).toBe(true))
      act(() => hook.result.current.onStartEditing())
      return hook
    }

    it('exposes the saved number on each token, null when none (AC-MC-25)', async () => {
      const { result } = setup()
      await waitFor(() => expect(result.current.status).toBe('ready'))
      expect(result.current.slots[0].jerseyNumber).toBe(1)
      expect(result.current.slots[1].jerseyNumber).toBeNull()
    })

    it('prefills the membership number when placing a player and closes the panel (AC-MC-26)', async () => {
      const { result } = await startEditing()
      act(() => result.current.onSelectSlot(0))
      act(() => result.current.onToggleReplace())
      await waitFor(() => expect(result.current.panel?.availablePlayers).toHaveLength(1))
      await waitFor(() => expect(result.current.slots[0].jerseyNumber).toBe(1))
      act(() => result.current.onPickPlayer('c'))
      expect(result.current.slots[0].userId).toBe('c')
      expect(result.current.slots[0].jerseyNumber).toBe(17)
      expect(result.current.panel).toBeNull()
    })

    it('keeps each number with its player on swap (AC-MC-28)', async () => {
      const { result } = await startEditing()
      act(() => result.current.onSelectSlot(0))
      act(() => result.current.onToggleSwap())
      act(() => result.current.onSelectSlot(1))
      expect(result.current.slots[0]).toMatchObject({ userId: 'b', jerseyNumber: null })
      expect(result.current.slots[1]).toMatchObject({ userId: 'a', jerseyNumber: 1 })
    })

    it('keeps the numbers when the formation changes (AC-MC-28)', async () => {
      const { result } = await startEditing()
      act(() => result.current.onSelectFormation('3-5-2'))
      expect(result.current.slots[0].jerseyNumber).toBe(1)
    })

    it('opens number editing on a long press without selecting a swap (edit mode only)', async () => {
      const { result } = await startEditing()
      act(() => result.current.onLongPressSlot(0))
      expect(result.current.panel?.mode).toBe('number')
      expect(result.current.panel?.numberText).toBe('1')
    })

    it('ignores a long press on a free slot or outside edit mode', async () => {
      const { result } = await startEditing()
      act(() => result.current.onLongPressSlot(5))
      expect(result.current.panel).toBeNull()
    })

    it('edits locally, flags a duplicate softly, and saves only on Terminé (AC-MC-27, PO-MC-14)', async () => {
      const { result } = await startEditing()
      act(() => result.current.onSelectSlot(1))
      act(() => result.current.onToggleNumber())
      act(() => result.current.onChangeNumber('1'))
      expect(result.current.panel?.numberWarning).toMatch(/déjà porté/)
      expect(result.current.panel?.numberError).toBeNull()
      expect(result.current.slots[1].jerseyNumber).toBe(1)
      expect(save).not.toHaveBeenCalled()

      act(() => result.current.onChangeNumber('12'))
      expect(result.current.panel?.numberWarning).toBeNull()
      act(() => result.current.onDone())
      await waitFor(() => expect(save).toHaveBeenCalledOnce())
      expect(save).toHaveBeenCalledWith(expect.objectContaining({ jerseyNumbers: { a: 1, b: 12 } }))
    })

    it('shows a readable error out of range and refuses to save past it (AC-MC-29)', async () => {
      const { result } = await startEditing()
      act(() => result.current.onSelectSlot(0))
      act(() => result.current.onToggleNumber())
      act(() => result.current.onChangeNumber('100'))
      expect(result.current.panel?.numberError).toBe('Entrez un nombre entier entre 1 et 99.')
      expect(result.current.slots[0].jerseyNumber).toBe(1)
      act(() => result.current.onDone())
      expect(save).not.toHaveBeenCalled()
    })

    it('clears the number with an empty field (placement never needs one)', async () => {
      const { result } = await startEditing()
      act(() => result.current.onSelectSlot(0))
      act(() => result.current.onToggleNumber())
      act(() => result.current.onChangeNumber(''))
      expect(result.current.slots[0].jerseyNumber).toBeNull()
      expect(result.current.panel?.numberError).toBeNull()
    })
  })
})
