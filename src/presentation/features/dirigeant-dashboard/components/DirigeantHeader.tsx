import { Avatar, AvatarFallback } from '@presentation/shared/components/ui/avatar'
import { Dot } from '@presentation/shared/components/Dot'
import { RoleSwitcher } from '@presentation/shared/components/RoleSwitcher'

interface DirigeantHeaderProps {
  firstName: string
  initials: string
  contextLabel: string
  onAvatarClick: () => void
}

// Sibling of CoachHeader (UI design §1 point 1): no team pill, no alerts
// button, no matchday marker — so no dummy props are passed to CoachHeader.
// `sticky top-0` with an opaque background, same as CoachHeader.
export function DirigeantHeader({
  firstName,
  initials,
  contextLabel,
  onAvatarClick,
}: DirigeantHeaderProps) {
  return (
    <header className="sticky top-0 z-10 isolate flex flex-col gap-5 overflow-hidden bg-coach-bg px-5.5 pt-[max(1.375rem,env(safe-area-inset-top))] pb-5">
      <div
        aria-hidden
        className="pointer-events-none absolute -inset-x-15 -top-10 -z-10 h-100 bg-[linear-gradient(180deg,transparent_0%,var(--color-coach-bg)_92%),url(/background.jpeg)] bg-cover bg-center"
      />

      <div className="relative flex items-center gap-2">
        <RoleSwitcher />

        <div className="absolute top-0 right-0 flex items-center gap-2">
          <button type="button" onClick={onAvatarClick} aria-label="Mon profil">
            <Avatar className="size-9.5 border-2 border-coach-red">
              <AvatarFallback className="bg-coach-green text-[13px] font-semibold text-white">{initials}</AvatarFallback>
            </Avatar>
          </button>
        </div>
      </div>

      <h1 className="pr-16 text-[30px] leading-[1.05] font-black tracking-tight text-white">
        Bonjour,
        <br />
        {firstName}
      </h1>

      <p className="flex items-center gap-1.5 text-[12.5px] font-semibold text-white/75">
        <Dot className="bg-white/40" />
        <span>{contextLabel}</span>
      </p>
    </header>
  )
}
