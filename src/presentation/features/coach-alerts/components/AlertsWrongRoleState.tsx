import { IconBellOff } from '@tabler/icons-react'

// specs/coach-alerts.md §2/AC-AL-05, UI design "Composant nouveau" #4 —
// same exact shape as PlayerStatsWrongRoleState.tsx (icon + title + message,
// centered, same classes), content specific to this screen: no team name to
// give (unlike the player-stats variant, there's no symmetric "coach's own
// team" to name here — the coach role is simply not active). Rendered
// BEFORE isLoading/error in CoachAlertsPage.tsx, same guard as
// PlayerStatsPage.tsx: this state never depends on any query having fired
// (AC-AL-05 — no data request at all for a player-active multi-role account
// reaching /alerts by direct URL).
export function AlertsWrongRoleState() {
  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3 px-6 py-20 text-center text-white">
      <IconBellOff className="size-9 text-white/40" aria-hidden />
      <p className="text-[15px] font-bold text-white">Rien à afficher pour le moment</p>
      <p className="max-w-xs text-[13px] text-white/50">Cet écran est réservé aux coachs.</p>
    </div>
  )
}
