import { AuthCard } from '../components/AuthCard'
import { formatRole } from '../../../shared/formatters/role-labels'
import { Alert, AlertDescription } from '../../../shared/components/ui/alert'
import { Badge } from '../../../shared/components/ui/badge'
import { Button } from '../../../shared/components/ui/button'
import { CardDescription, CardTitle } from '../../../shared/components/ui/card'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import { Separator } from '../../../shared/components/ui/separator'
import { useActivationViewModel } from './useActivationViewModel'

const fieldInputClass =
  'h-auto rounded-[14px] border-auth-border bg-white px-4 py-3.25 text-[13.5px] text-auth-text placeholder:text-auth-text-muted focus-visible:border-auth-primary focus-visible:ring-0'
const submitButtonClass =
  'h-auto w-full rounded-full bg-auth-primary py-3.5 text-sm font-bold text-white hover:bg-auth-primary-hover disabled:bg-auth-disabled-bg disabled:text-auth-disabled-text'

// specs/web-users-invitation-links.md §5 — replaces the e-mail-delivered
// invite flow /update-password used to double as (see this feature's own
// findings): that page's welcome step relies on Supabase's automatic
// hash-token session detection from action_link, which a WhatsApp/SMS
// link-preview crawler would silently consume before the member ever taps
// anything. This screen never verifies on load (point 1) — only the tap on
// "Activer mon compte" calls verifyOtp(). /update-password itself is
// untouched: it still serves the still-email-delivered password-reset case
// (CDC §3.1, docs/DEFAULTS-A-CHALLENGER.md "Manual delivery channel").
export function ActivationPage() {
  const vm = useActivationViewModel()

  if (vm.status === 'invalid') {
    return (
      <AuthCard>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border-2 border-auth-primary text-xl font-extrabold text-auth-primary">
          !
        </span>
        <CardTitle className="text-center text-[19px] font-extrabold text-auth-text">Lien invalide ou expiré</CardTitle>
        <CardDescription className="text-center text-[12.5px] leading-relaxed text-auth-text-muted">
          Ce lien n'est plus valide. Contactez un administrateur du club pour en obtenir un nouveau.
        </CardDescription>
      </AuthCard>
    )
  }

  if (vm.status === 'ready' || vm.status === 'verifying') {
    return (
      <AuthCard brand>
        <CardTitle className="text-center text-[19px] font-extrabold text-auth-text">
          {vm.invitedName ? `Bonjour, ${vm.invitedName}` : 'Activer votre compte'}
        </CardTitle>
        <CardDescription className="text-center text-[12.5px] leading-relaxed text-auth-text-muted">
          {vm.invitedName
            ? 'Ce lien est personnel et vous permet d’activer votre compte. Appuyez sur le bouton ci-dessous pour continuer.'
            : 'Ce lien est personnel. Appuyez sur le bouton ci-dessous pour continuer.'}
        </CardDescription>
        <Button type="button" disabled={vm.status === 'verifying'} onClick={vm.verify} className={submitButtonClass}>
          {vm.status === 'verifying' ? 'Vérification…' : 'Activer mon compte'}
        </Button>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      <div className="flex flex-col gap-3">
        <CardTitle className="text-[19px] font-extrabold text-auth-text">Bonjour, {vm.fullName}</CardTitle>
        <CardDescription className="text-[12.5px] leading-relaxed text-auth-text-muted">
          Vous avez été invité(e) sur AS Caribbean en tant que :
        </CardDescription>
        <div className="mt-2.5 flex flex-wrap gap-1.5">
          {vm.roles.map((assignment) => (
            <Badge key={assignment.role} variant="outline" className="rounded-full border-[1.3px] border-auth-primary px-2.75 py-1 text-[11.5px] font-bold text-auth-primary">
              {formatRole(assignment.role)}
            </Badge>
          ))}
        </div>
      </div>
      <Separator className="bg-auth-border" />

      <CardTitle className="text-[19px] font-extrabold text-auth-text">Définir votre mot de passe</CardTitle>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          vm.submitPassword()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activation-password-new" className="sr-only">
            Nouveau mot de passe
          </Label>
          <Input
            id="activation-password-new"
            type="password"
            autoComplete="new-password"
            placeholder="Mot de passe"
            required
            minLength={8}
            value={vm.newPassword}
            onChange={(event) => vm.setNewPassword(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="activation-password-confirm" className="sr-only">
            Confirmer le mot de passe
          </Label>
          <Input
            id="activation-password-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Confirmer le mot de passe"
            required
            minLength={8}
            value={vm.confirmPassword}
            onChange={(event) => vm.setConfirmPassword(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        {vm.confirmPassword.length > 0 && !vm.passwordsMatch && (
          <Alert variant="destructive" className="rounded-[14px] border-auth-primary bg-[oklch(96%_0.03_26)]">
            <AlertDescription className="text-[12.5px] text-[oklch(38%_0.15_26)]">
              Les mots de passe ne correspondent pas.
            </AlertDescription>
          </Alert>
        )}
        {vm.passwordError && (
          <Alert variant="destructive" className="rounded-[14px] border-auth-primary bg-[oklch(96%_0.03_26)]">
            <AlertDescription className="text-[12.5px] text-[oklch(38%_0.15_26)]">{vm.passwordError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={!vm.passwordsMatch || vm.isSubmittingPassword} className={submitButtonClass}>
          {vm.isSubmittingPassword ? 'Enregistrement…' : 'Continuer'}
        </Button>
      </form>
    </AuthCard>
  )
}
