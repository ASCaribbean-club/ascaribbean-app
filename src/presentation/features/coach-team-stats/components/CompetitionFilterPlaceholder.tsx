// UI design §4.2/§5 — "Conçu ici, non construit dans cette passe" (PO-CTS-01/
// AC-CTS-12): `match_details.competition_type` doesn't exist in the database
// yet, so "Championnat"/"Amicaux" have no data to filter by. Per the spec's
// own recommendation ("ne rendre QUE le chip 'Tout', actif et unique — ne pas
// construire de chips cliquables sans effet réel"), this renders a single,
// inert, always-selected "Tout" chip — no onClick, no state, nothing behind
// it to wire up once competition_type is added beyond swapping this one
// component out for the real TypeSelector-shaped control the spec describes.
export function CompetitionFilterPlaceholder() {
  return (
    <div role="group" aria-label="Type de compétition" className="flex flex-wrap gap-2">
      <span
        aria-disabled
        className="flex h-11 items-center gap-2 rounded-full border border-transparent bg-white px-3.5 text-[13.5px] font-bold text-black"
      >
        Tout
      </span>
    </div>
  )
}
