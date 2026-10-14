// Mockup state 4 — replaces the progress card once the top tier is reached.
export function LegacyMaxLevelCard() {
  return (
    <section className="flex flex-col gap-1.5 rounded-3xl border border-emerald-500/40 bg-emerald-500/10 p-4.5">
      <h2 className="text-base font-extrabold text-white">Niveau maximum atteint</h2>
      <p className="text-[13px] text-white/70">
        Vous êtes au sommet de l'ASC Legacy. Vos avantages restent acquis à vie. Merci pour votre fidélité au club.
      </p>
    </section>
  )
}
