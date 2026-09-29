import { Dot } from '@presentation/shared/components/Dot'

interface TeamIdentityRowProps {
  sectionName: string | undefined
  activeMemberCount: number | undefined
}

// UI design §3/§7 — "Seniors · 18 licenciés". AC-CTS-11 — `activeMemberCount`
// is a headcount (team_active_headcount, same source as the coach-dashboard
// header), never a membership/cotisation status — this component receives
// it as a plain number, with no notion of adhésion at all. Same "licenciés"
// wording (no singular/plural branch) as CoachHeader's own context line, for
// consistency across both screens.
export function TeamIdentityRow({ sectionName, activeMemberCount }: TeamIdentityRowProps) {
  return (
    <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/75">
      <Dot className="bg-coach-green" />
      <span>
        {sectionName}
        {activeMemberCount !== undefined ? ` · ${activeMemberCount} licenciés` : null}
      </span>
    </p>
  )
}
