// TODO(PO-1): stub screen — see specs/coach-dashboard.md §1 "Écarts maquette
// / CDC" and AC-CD-05d. "Actus" (annonces internes) is the Communication
// module, P1, not specified yet. This stays a static message on purpose:
// no list, no loading skeleton, no ViewModel — there's nothing to load. Give
// it a real useActusViewModel.ts once Communication has a spec of its own.
export function ActusPage() {
  return (
    <div className="flex min-h-[60svh] flex-col items-center justify-center gap-2 px-6 text-center text-white">
      <h1 className="text-lg font-extrabold">Actus</h1>
      <p className="text-sm text-white/60">Bientôt disponible</p>
    </div>
  )
}
