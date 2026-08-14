import { AuthCard } from '../components/AuthCard'
import { useCharterViewModel } from './useCharterViewModel'

// Charter text/URL: OPEN — not specified anywhere yet (no docs/CHARTE.md,
// nothing in docs/specs/). Placeholder below, per CLAUDE.md §7 ("don't
// resolve a point explicitly marked OPEN — implement around it, flag it").
export function CharterPage() {
  const vm = useCharterViewModel()

  return (
    <AuthCard title="Charte du club">
      <div className="auth-charter-text">
        {/* TODO OPEN: real charter content/URL not specified yet — club to provide. */}
        Le texte de la charte n'est pas encore disponible ici.
      </div>

      <label className="auth-checkbox-label">
        <input type="checkbox" checked={vm.hasRead} onChange={(event) => vm.setHasRead(event.target.checked)} />
        J'ai lu et j'accepte la charte du club
      </label>

      <button type="button" className="auth-button" disabled={!vm.canAccept} onClick={vm.accept}>
        {vm.isAccepting ? 'Enregistrement…' : 'Activer mon compte'}
      </button>
    </AuthCard>
  )
}
