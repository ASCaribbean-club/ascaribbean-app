import type { AdminConvocationDisplayStatus } from '@domain/policies/convocation-admin-windows'
import { Badge } from '@presentation/shared/components/ui/badge'
import { cn } from '@presentation/shared/lib/utils'

// specs/web-create-convocation.md UI design "Colonne STATUT" (AC-WC-07,
// PO-WC-03 proposal): a past `open` convocation reads "Passée", never
// "Clôturée"; "Clôturée" is reserved for the real `closed` status. Same
// tokens as SeasonStatusBadge; the text is always present, never color alone.
const LABEL: Record<AdminConvocationDisplayStatus, string> = {
  open: 'Ouverte',
  cancelled: 'Annulée',
  past: 'Passée',
  closed: 'Clôturée',
}

const CLASSNAME: Record<AdminConvocationDisplayStatus, string> = {
  open: 'border-coach-green/35 bg-coach-green/15 text-coach-green-text',
  cancelled: 'border-coach-red/35 bg-coach-red/15 text-coach-red-text',
  past: 'border-white/15 bg-white/10 text-white/70',
  closed: 'border-white/15 bg-white/10 text-white/70',
}

export function ConvocationStatusBadge({ status }: { status: AdminConvocationDisplayStatus }) {
  return (
    <Badge className={cn('rounded-full px-2.5 py-1 text-xs font-extrabold tracking-wide uppercase', CLASSNAME[status])}>
      {LABEL[status]}
    </Badge>
  )
}
