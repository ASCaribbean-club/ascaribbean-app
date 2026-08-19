import { Link } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { Alert, AlertDescription } from '../../../shared/components/ui/alert'
import { Button } from '../../../shared/components/ui/button'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import { useForgotPasswordViewModel } from './useForgotPasswordViewModel'

const fieldInputClass =
  'h-auto rounded-[14px] border-auth-border bg-white px-4 py-3.25 text-[13.5px] text-auth-text placeholder:text-auth-text-muted focus-visible:border-auth-primary focus-visible:ring-0'
const submitButtonClass =
  'h-auto w-full rounded-full bg-auth-primary py-3.5 text-sm font-bold text-white hover:bg-auth-primary-hover disabled:bg-auth-disabled-bg disabled:text-auth-disabled-text'

export function ForgotPasswordPage() {
  const vm = useForgotPasswordViewModel()

  return (
    <AuthCard title="Mot de passe oublié" subtitle="Saisissez votre email, nous vous envoyons un lien de réinitialisation.">
      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          vm.requestReset()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="forgot-password-email" className="sr-only">
            Adresse email
          </Label>
          <Input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            placeholder="Adresse email"
            required
            disabled={vm.requestSent}
            value={vm.email}
            onChange={(event) => vm.setEmail(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        <Button type="submit" disabled={vm.isRequesting || vm.requestSent} className={submitButtonClass}>
          {vm.isRequesting ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
        </Button>

        {vm.requestSent && (
          <Alert className="rounded-[14px] border-auth-success-border bg-auth-success-bg">
            <AlertDescription className="text-[12.5px] text-auth-success-text">
              Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
            </AlertDescription>
          </Alert>
        )}

        <Link to="/login" className="text-center text-[12.5px] font-semibold text-auth-text-muted">
          Retour à la connexion
        </Link>
      </form>
    </AuthCard>
  )
}
