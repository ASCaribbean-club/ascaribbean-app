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
    <div className="response-bar">
      <div className="response-bar__track" role="img" aria-hidden>
        <span
          className="response-bar__segment response-bar__segment--present"
          style={{ width: total > 0 ? `${(counts.present / total) * 100}%` : 0 }}
        />
        <span
          className="response-bar__segment response-bar__segment--absent"
          style={{ width: total > 0 ? `${(counts.absent / total) * 100}%` : 0 }}
        />
        <span
          className="response-bar__segment response-bar__segment--pending"
          style={{ width: total > 0 ? `${(counts.pending / total) * 100}%` : 0 }}
        />
      </div>
      <ul className="response-bar__legend">
        <li>{counts.present} présents</li>
        <li>{counts.absent} absents</li>
        <li>{counts.pending} en attente</li>
      </ul>
      {/* AC-CD-05b / PO-4 : pas de CTA de relance ici — la carte se termine
          sur cette légende. */}
    </div>
  )
}
