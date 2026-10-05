import { IconExternalLink } from '@tabler/icons-react'
import { Button } from '@presentation/shared/components/ui/button'

interface DuesPaymentLinkProps {
  paymentUrl: string
}

// specs/profile-membership-dues.md §5 — rendered only when the ViewModel says
// so (showPaymentLink); never greyed, never replaced by a placeholder
// (AC-PMD-12). A plain external redirect: the exact season URL, no parameter
// added (AC-PMD-13), no write call (AC-PMD-14).
export function DuesPaymentLink({ paymentUrl }: DuesPaymentLinkProps) {
  return (
    <div className="mt-2.5 flex flex-col gap-2">
      <Button
        asChild
        className="h-11 w-full min-w-0 rounded-full bg-coach-green font-bold text-white hover:bg-coach-green"
      >
        <a href={paymentUrl} target="_blank" rel="noopener noreferrer">
          Payer ma cotisation
          <IconExternalLink aria-hidden />
          <span className="sr-only">(s'ouvre dans un nouvel onglet)</span>
        </a>
      </Button>
      <p className="text-[12.5px] text-white/60">
        Le paiement s'effectue sur un site externe. Il apparaîtra ici une fois enregistré par le trésorier.
      </p>
    </div>
  )
}
