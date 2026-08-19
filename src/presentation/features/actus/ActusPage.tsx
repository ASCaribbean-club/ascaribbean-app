// TODO(PO-1): stub screen — see specs/coach-dashboard.md §1 "Écarts maquette
// / CDC" and AC-CD-05d. "Actus" (annonces internes) is the Communication
// module, P1, not specified yet. This stays a static message on purpose:
// no list, no loading skeleton, no ViewModel — there's nothing to load. Give
// it a real useActusViewModel.ts once Communication has a spec of its own.
export function ActusPage() {
  return (
    <div className="actus-stub">
      <h1>Actus</h1>
      <p>Bientôt disponible</p>
    </div>
  )
}
