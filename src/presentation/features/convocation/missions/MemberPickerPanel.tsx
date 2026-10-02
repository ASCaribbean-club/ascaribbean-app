import { RoleBadge } from './RoleBadge'
import type { MissionMemberView } from './useConvocationMissionsViewModel'

interface MemberPickerPanelProps {
  members: MissionMemberView[]
  onSelect: (userId: string) => void
  onClose: () => void
}

// "Choisir un membre" (Coach 2 export). The ViewModel already removed the
// people registered on the mission. Capped height with internal scroll.
export function MemberPickerPanel({ members, onSelect, onClose }: MemberPickerPanelProps) {
  return (
    <div className="flex flex-col gap-2 rounded-2xl border border-white/10 bg-white/3 p-3">
      <p className="text-[13px] font-bold text-white/60">Choisir un membre</p>
      {members.length === 0 ? (
        <p className="py-2 text-[12.5px] text-white/60">Aucun membre disponible</p>
      ) : (
        <ul className="flex flex-col gap-2">
          {members.map((member) => (
            <li key={member.userId}>
              <button
                type="button"
                onClick={() => onSelect(member.userId)}
                className="flex min-h-11 w-full items-center rounded-xl border border-white/15 bg-white/4 px-3 text-left text-[14px] font-medium text-white hover:bg-white/10"
              >
                <span className="min-w-0 flex-1 truncate">{member.displayName}</span>
                <RoleBadge role={member.role} />
              </button>
            </li>
          ))}
        </ul>
      )}
      <button type="button" onClick={onClose} className="flex min-h-11 items-center justify-end px-1 text-[13px] font-semibold text-white/60">
        Fermer
      </button>
    </div>
  )
}
