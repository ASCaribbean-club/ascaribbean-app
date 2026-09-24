import { AuthCard } from '../components/AuthCard'
import { Alert, AlertDescription } from '../../../shared/components/ui/alert'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import { useLoginViewModel } from './useLoginViewModel'

const fieldInputClass =
  'h-auto rounded-[14px] border-auth-border bg-white px-4 py-3.25 text-[13.5px] text-auth-text placeholder:text-auth-text-muted focus-visible:border-auth-primary focus-visible:ring-0'
const submitButtonClass =
  'h-auto w-full rounded-full bg-auth-primary py-3.5 text-sm font-bold text-white hover:bg-auth-primary-hover disabled:bg-auth-disabled-bg disabled:text-auth-disabled-text'

export function LoginPage() {
  const vm = useLoginViewModel()

  return (
    <AuthCard brand>
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          vm.submit()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-email" className="sr-only">
            Adresse email
          </Label>
          <Input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="Adresse email"
            required
            value={vm.email}
            onChange={(event) => vm.setEmail(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="login-password" className="sr-only">
            Mot de passe
          </Label>
          <Input
            id="login-password"
            type="password"
            autoComplete="current-password"
            placeholder="Mot de passe"
            required
            value={vm.password}
            onChange={(event) => vm.setPassword(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        {vm.signInError && (
          <Alert variant="destructive" className="rounded-[14px] border-auth-primary bg-[oklch(96%_0.03_26)]">
            <AlertDescription className="text-[12.5px] text-[oklch(38%_0.15_26)]">{vm.signInError}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={vm.isSubmitting} className={submitButtonClass}>
          {vm.isSubmitting ? 'Envoi…' : 'Se connecter'}
        </Button>

        {/* specs/web-users-invitation-links.md §5 — password reset is
            admin-mediated (InviteUserDialog's 'reset-password' mode), same
            manual-delivery channel as invitations: no self-service page to
            link to here, just a pointer to the actual next step. */}
        <p className="text-center text-[12.5px] font-semibold text-auth-text-muted">
          Mot de passe oublié ? Contactez un administrateur du club.
        </p>
      </form>
    </AuthCard>
  )
}
