import { Link } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { useForgotPasswordViewModel } from './useForgotPasswordViewModel'

export function ForgotPasswordPage() {
  const vm = useForgotPasswordViewModel()

  return (
    <AuthCard title="Mot de passe oublié" subtitle="Saisissez votre email, nous vous envoyons un lien de réinitialisation.">
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault()
          vm.requestReset()
        }}
      >
        <div className="auth-field">
          <label htmlFor="forgot-password-email" className="sr-only">
            Adresse email
          </label>
          <input
            id="forgot-password-email"
            type="email"
            autoComplete="email"
            placeholder="Adresse email"
            required
            disabled={vm.requestSent}
            value={vm.email}
            onChange={(event) => vm.setEmail(event.target.value)}
          />
        </div>

        <button type="submit" className="auth-button" disabled={vm.isRequesting || vm.requestSent}>
          {vm.isRequesting ? 'Envoi…' : 'Envoyer le lien de réinitialisation'}
        </button>

        {vm.requestSent && (
          <p className="auth-alert auth-alert--success">
            Si un compte existe avec cet email, un lien de réinitialisation a été envoyé.
          </p>
        )}

        <Link to="/login" className="auth-link auth-link--muted">
          Retour à la connexion
        </Link>
      </form>
    </AuthCard>
  )
}
