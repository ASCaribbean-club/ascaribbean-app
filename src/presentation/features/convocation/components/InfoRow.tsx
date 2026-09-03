import type { ReactNode } from 'react'

interface InfoRowProps {
  label: string
  children: ReactNode
}

// One "label à gauche / valeur à droite" line in the Infos tab (UI design
// §"Structure de l'écran", point 3). Deliberately NOT a two-column grid with
// `min-w-0` like CreateConvocationForm's Date/Heure pairs — the spec calls
// this out explicitly: "chaque ligne occupe la largeur complète ; une valeur
// longue s'enroule sur deux lignes plutôt que de chevaucher un voisin",
// i.e. no side-by-side field to protect from CLAUDE.md §6's overlap issue
// here, just a label that never wraps and a value that's free to.
export function InfoRow({ label, children }: InfoRowProps) {
  return (
    <div className="flex items-start justify-between gap-4 border-b border-white/8 py-2.5 last:border-b-0">
      <span className="shrink-0 text-[10.5px] font-medium tracking-wide text-white/50 uppercase">{label}</span>
      <span className="text-right text-[12.5px] font-medium text-white">{children}</span>
    </div>
  )
}
