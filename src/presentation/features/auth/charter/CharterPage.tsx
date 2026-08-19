import { AuthCard } from '../components/AuthCard'
import { Button } from '../../../shared/components/ui/button'
import { Checkbox } from '../../../shared/components/ui/checkbox'
import { Label } from '../../../shared/components/ui/label'
import { useCharterViewModel } from './useCharterViewModel'

// Charter text/URL: OPEN — not specified anywhere yet (no docs/CHARTE.md,
// nothing in docs/specs/). Placeholder below, per CLAUDE.md §7 ("don't
// resolve a point explicitly marked OPEN — implement around it, flag it").
export function CharterPage() {
  const vm = useCharterViewModel()

  return (
    <AuthCard title="Charte du club">
      <div className="max-h-40 overflow-y-auto rounded-[14px] bg-auth-bg p-3.5 text-xs leading-relaxed text-[oklch(48%_0.01_90)]">
        {/* TODO OPEN: real charter content/URL not specified yet — club to provide. */}
        Le texte de la charte n'est pas encore disponible ici.
      </div>

      <Label htmlFor="charter-accept" className="items-start gap-2.5 text-[12.5px] font-semibold text-auth-text">
        <Checkbox
          id="charter-accept"
          checked={vm.hasRead}
          onCheckedChange={(checked) => vm.setHasRead(checked === true)}
          className="mt-0.5 size-4.5 border-auth-border data-[state=checked]:border-auth-primary data-[state=checked]:bg-auth-primary"
        />
        J'ai lu et j'accepte la charte du club
      </Label>

      <Button
        type="button"
        disabled={!vm.canAccept}
        onClick={vm.accept}
        className="h-auto w-full rounded-full bg-auth-primary py-3.5 text-sm font-bold text-white hover:bg-auth-primary-hover disabled:bg-auth-disabled-bg disabled:text-auth-disabled-text"
      >
        {vm.isAccepting ? 'Enregistrement…' : 'Activer mon compte'}
      </Button>
    </AuthCard>
  )
}
