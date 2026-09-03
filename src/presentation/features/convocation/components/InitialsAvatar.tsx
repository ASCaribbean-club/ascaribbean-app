import { Avatar, AvatarFallback } from '../../../shared/components/ui/avatar'
import { getInitials } from '../../../shared/formatters/greeting'
import { cn } from '../../../shared/lib/utils'

interface InitialsAvatarProps {
  name: string
  className?: string
}

// A round, initials-only avatar — reused for both the opponent crest in the
// match hero ("CG" for "Caribbean Girlz", per the mockup) and every row of
// the Effectif roster list ("CP", "LD"...). `Opponent` (domain/entities/
// opponent.ts) and `User` (domain/entities/user.ts) both carry only an
// `id`/name field, no logo/photo — same getInitials formatter already used
// by PlayerHeader/CoachHeader for the account avatar, so the "first letter
// of the first two words" rule stays identical everywhere in the app rather
// than reimplemented per screen.
export function InitialsAvatar({ name, className }: InitialsAvatarProps) {
  return (
    <Avatar className={cn('size-11 border border-white/10', className)}>
      <AvatarFallback className="bg-white/10 text-[11.5px] font-bold text-white">{getInitials(name)}</AvatarFallback>
    </Avatar>
  )
}
