import { Card } from '../../../shared/components/ui/card'
import { StaticSwitch } from './StaticSwitch'

interface RecipientsCardProps {
  count: number | undefined
}

// DESTINATAIRES block (UI design §"Structure de l'écran", point 4) — purely
// informational in this pass: no player-by-player selection exists yet
// (specs/create-convocation.md §1, "Ce que cette feature ne couvre pas").
// `count` is read from the same source as the dashboard's headcount pill
// (passed through router state by useCoachDashboardViewModel — see
// useCreateConvocationViewModel), never computed here.
export function RecipientsCard({ count }: RecipientsCardProps) {
  return (
    <section>
      <div className="mb-2.5 flex items-baseline justify-between">
        <h2 className="text-[11.5px] font-extrabold tracking-wider text-white/50 uppercase">DESTINATAIRES</h2>
        {count !== undefined && (
          <span className="text-[13px] font-bold text-coach-green-text">{count} sélectionnés</span>
        )}
      </div>

      <Card className="flex-row items-center justify-between border-white/10 bg-white/6 px-4 py-3.5">
        <div>
          <p className="m-0 text-[14.5px] font-bold text-white">Toute l'équipe</p>
          <p className="m-0 mt-0.5 text-[12px] text-white/50">Par défaut pour entraînements et matchs</p>
        </div>
        <StaticSwitch />
      </Card>
    </section>
  )
}
