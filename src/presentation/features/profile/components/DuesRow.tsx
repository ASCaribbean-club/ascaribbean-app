import { useState } from 'react'
import { IconChevronDown } from '@tabler/icons-react'
import { PaymentStatusBadge } from '@presentation/shared/components/PaymentStatusBadge'
import { cn } from '@presentation/shared/lib/utils'
import type { ProfileDuesView } from '../profile-dues-view'

interface DuesRowProps {
  dues: ProfileDuesView
}

// specs/profile-membership-dues.md §3 — the "Cotisation" row of the Adhésion
// card: the whole row is the toggle (min-h-11), `aria-expanded` + a rotating
// chevron (not colour alone) signal the state. Read-only: no action button
// anywhere (AC-PMD-08), and never recorded_by / recorded_at (AC-PMD-03).
// Collapsed by default; the open state is local UI state only.
export function DuesRow({ dues }: DuesRowProps) {
  const [isExpanded, setIsExpanded] = useState(false)
  const panelId = 'profile-dues-payments'
  const open = dues.isExpandable && isExpanded

  const header = (
    <>
      <span className="flex min-w-0 flex-1 items-baseline gap-2">
        <span className="shrink-0 text-[13.5px] text-white/50">Cotisation</span>
        <span className="min-w-0 truncate text-[14px] font-bold text-white">{dues.amountsLabel}</span>
      </span>
      {dues.undefinedMention ? (
        <span className="shrink-0 text-[12.5px] text-white/50">{dues.undefinedMention}</span>
      ) : (
        <PaymentStatusBadge status={dues.status} label={dues.statusLabel} />
      )}
      {dues.isExpandable && (
        <IconChevronDown aria-hidden className={cn('size-4.5 shrink-0 text-white/60 transition-transform', open && 'rotate-180')} />
      )}
    </>
  )

  return (
    <li className="border-t border-white/10">
      {dues.isExpandable ? (
        <button
          type="button"
          onClick={() => setIsExpanded((current) => !current)}
          aria-expanded={open}
          aria-controls={panelId}
          aria-label={dues.toggleAriaLabel}
          className="flex min-h-11 w-full min-w-0 items-center gap-3 px-4 py-3.5 text-left"
        >
          {header}
        </button>
      ) : (
        <div className="flex min-h-11 w-full min-w-0 items-center gap-3 px-4 py-3.5">{header}</div>
      )}

      {open && (
        <div id={panelId} className="flex flex-col gap-2 border-t border-white/10 px-4 py-3">
          <h3 className="text-[11.5px] font-bold tracking-wider text-white/45 uppercase">Versements</h3>
          {dues.payments.length === 0 ? (
            <p className="text-[13px] text-white/70">Aucun versement enregistré</p>
          ) : (
            <ul className="flex flex-col gap-1.5">
              {dues.payments.map((payment) => (
                <li key={payment.id} className="flex min-w-0 items-baseline justify-between gap-3">
                  <span className="shrink-0 text-[14px] font-extrabold text-white">{payment.amountLabel}</span>
                  <span className="min-w-0 truncate text-[12.5px] text-white/70">
                    {payment.methodLabel ? `${payment.methodLabel} · ${payment.dateLabel}` : payment.dateLabel}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}
    </li>
  )
}
