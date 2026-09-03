import type { ResponseCounts } from '@domain/rules/convocation-rules'

interface ResponseBarProps {
  counts: ResponseCounts
}

// AC-CD-12 : la couleur seule ne porte jamais l'information — chaque
// segment est doublé d'un libellé textuel ci-dessous, pas seulement du vert/
// rouge/gris de la barre.
export function ResponseBar({ counts }: ResponseBarProps) {
  const total = counts.present + counts.absent + counts.pending

  return (
    <div className="flex flex-col gap-2.5">
      {total > 0 && (
        <div className="flex h-2 gap-0.5 overflow-hidden rounded-full" role="img" aria-hidden>
          <span className="h-full bg-coach-green" style={{ width: `${(counts.present / total) * 100}%` }} />
          <span className="h-full bg-coach-red" style={{ width: `${(counts.absent / total) * 100}%` }} />
          <span className="h-full bg-white/18" style={{ width: `${(counts.pending / total) * 100}%` }} />
        </div>
      )}
      <ul className="flex list-none gap-3.5 p-0 text-[11.5px] font-bold">
        <li className="text-coach-green-text">{counts.present} présents</li>
        <li className="text-coach-red-text">{counts.absent} absents</li>
        <li className="text-white/50">{counts.pending} en attente</li>
      </ul>
      {/* AC-CD-05b / PO-4 : pas de CTA de relance ici — la carte se termine
          sur cette légende. */}
    </div>
  )
}
