import { IconChartBarOff } from '@tabler/icons-react'

// This screen (person-scoped, §6.3) has no content for a coach account —
// shown instead of PlayerStatsEmptyState's player-oriented copy ("validé
// par ton coach") when the active dashboard role is 'coach' (a coach
// reaching /stats directly rather than via the Menu card, which now routes
// the coach role to /team-stats — see useMenuViewModel.ts). Same shape as
// PlayerStatsEmptyState on purpose, different copy: no "your coach" wording,
// names the coach's own team instead.
export function PlayerStatsWrongRoleState({ teamName }: { teamName: string | undefined }) {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center text-white">
      <IconChartBarOff className="size-9 text-white/40" aria-hidden />
      <p className="text-[15px] font-bold text-white">Rien à afficher pour le moment</p>
      <p className="max-w-xs text-[13px] text-white/50">
        {teamName
          ? `Aucune statistique n'est disponible pour l'équipe ${teamName} pour le moment.`
          : "Aucune statistique n'est disponible pour votre équipe pour le moment."}
      </p>
    </div>
  )
}
