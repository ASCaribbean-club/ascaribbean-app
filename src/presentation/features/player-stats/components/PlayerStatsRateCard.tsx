import { Card, CardContent, CardHeader, CardTitle } from '@presentation/shared/components/ui/card'
import { Progress } from '@presentation/shared/components/ui/progress'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'

export type PlayerStatsRateCardStatus = 'loading' | 'unavailable' | 'available' | 'error'

interface PlayerStatsRateCardProps {
  // AC-PS-16 — "Taux de réponse" / "Taux de présence", never interchangeable,
  // never shared between the two instances of this component.
  title: string
  status: PlayerStatsRateCardStatus
  // 0-100, rounded — only meaningful when status === 'available'.
  percent: number | null
  numerator: number
  denominator: number
  // "séances validées" (attendance, AC-PS-16 literal wording) / "convocations
  // passées" (response, UI-PS-C — shown for both per the UI design's own
  // proposal for readability, even though only the attendance card is
  // MANDATED to show it).
  denominatorNoun: string
  // §4.1/§4.2 of the UI design — the zero-denominator sub-state's own short
  // copy, distinct per card (never a bare 0%/100%, AC-PS-17).
  unavailableMessage: string
  errorMessage: string
  // Addendum "troisième passage" (PO-PS-12 partiellement tranché) —
  // attendance-only breakdown by convocation type ("Entraînement · 6/8",
  // AC-PS-26/27). Omitted/empty on the response card instance — that one
  // stays a single global aggregate, unventilated, per that same addendum.
  breakdown?: { label: string; numerator: number; denominator: number }[]
}

// specs/player-stats.md UI design §5 — "PlayerStatsRateCard", reused twice
// (response, attendance) with two entirely independent data sets: this
// component NEVER merges/averages the two taux it's instantiated with
// (AC-PS-16) — that separation is enforced one level up, by the ViewModel
// never being asked to combine them, not by anything in this file, but is
// worth repeating here since this is the shared shape both go through.
//
// AC-PS-23 — the progress bar never carries information alone: the
// percentage is already rendered as text right above it.
export function PlayerStatsRateCard({
  title,
  status,
  percent,
  numerator,
  denominator,
  denominatorNoun,
  unavailableMessage,
  errorMessage,
  breakdown = [],
}: PlayerStatsRateCardProps) {
  return (
    <Card className="gap-3 rounded-[18px] border-white/10 bg-white/6 p-4.5">
      <CardHeader className="p-0">
        <CardTitle className="text-[10.5px] font-extrabold tracking-wider text-white/55 uppercase">{title}</CardTitle>
      </CardHeader>
      <CardContent className="flex flex-col gap-2.5 p-0">
        {status === 'loading' && (
          <div className="flex flex-col gap-2.5">
            <Skeleton className="h-8 w-32" />
            <Skeleton className="h-1 w-full rounded-full" />
            <Skeleton className="h-3 w-40" />
          </div>
        )}

        {status === 'error' && <p className="text-[13px] font-semibold text-white/50">{errorMessage}</p>}

        {/* AC-PS-17 — never a bare 0%/100% for a zero denominator: a short
            textual substitute instead, no percentage, no bar at all. */}
        {status === 'unavailable' && <p className="text-[13px] font-semibold text-white/50">{unavailableMessage}</p>}

        {status === 'available' && percent !== null && (
          <>
            <p className="text-[26px] font-extrabold text-white">
              {percent} % <span className="text-[15px] font-bold text-white/50">· {numerator}/{denominator}</span>
            </p>
            <Progress value={percent} className="h-1.5" />
            <p className="text-[12.5px] font-semibold text-white/50">
              sur {denominator} {denominatorNoun}
            </p>

            {/* Addendum "troisième passage" (PO-PS-12 partiellement tranché)
                — sous-bloc de ventilation par type, uniquement sur la carte
                présence (le taux de réponse ne passe jamais de `breakdown`,
                cette liste reste alors vide). Jamais une ligne pour un type
                sans séance validée (AC-PS-26/27) — `breakdown` n'en contient
                déjà aucune. */}
            {breakdown.length > 0 && (
              <ul className="flex flex-col gap-1 border-t border-white/10 pt-2.5">
                {breakdown.map((row) => (
                  <li key={row.label} className="flex items-center justify-between text-[12.5px] font-semibold text-white/60">
                    <span className="truncate">{row.label}</span>
                    <span className="shrink-0 text-white/80">
                      {row.numerator}/{row.denominator}
                    </span>
                  </li>
                ))}
              </ul>
            )}
          </>
        )}
      </CardContent>
    </Card>
  )
}
