import { Link } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { useLoginViewModel } from './useLoginViewModel'

export function LoginPage() {
  const vm = useLoginViewModel()

  return (
    <AuthCard brand>
      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault()
          vm.submit()
        }}
      >
        <div className="auth-field">
          <label htmlFor="login-email" className="sr-only">
            Adresse email
          </label>
          <input
            id="login-email"
            type="email"
            autoComplete="email"
            placeholder="Adresse email"
            required
            value={vm.email}
            onChange={(event) => vm.setEmail(event.target.value)}
          />
        </div>

        {vm.isPasswordMode && (
          <div className="auth-field">
            <label htmlFor="login-password" className="sr-only">
              Mot de passe
            </label>
            <input
              id="login-password"
              type="password"
              autoComplete="current-password"
              placeholder="Mot de passe"
              required
              value={vm.password}
              onChange={(event) => vm.setPassword(event.target.value)}
            />
          </div>
        )}

        {vm.signInError && (
          <p className="auth-alert auth-alert--error" role="alert">
            {vm.signInError}
          </p>
        )}

        {!vm.isPasswordMode && vm.magicLinkSent && (
          <p className="auth-alert auth-alert--success">Un lien de connexion a été envoyé à {vm.email}.</p>
        )}

        <button type="submit" className="auth-button" disabled={vm.isSubmitting}>
          {vm.isSubmitting ? 'Envoi…' : vm.primaryLabel}
        </button>

        {vm.isPasswordMode ? (
          <>
            <button type="button" className="auth-link" onClick={vm.toggleMode}>
              Recevoir un lien de connexion à usage unique
            </button>
            <Link to="/forgot-password" className="auth-link auth-link--muted">
              Mot de passe oublié ?
            </Link>
          </>
        ) : (
          <button type="button" className="auth-link" onClick={vm.toggleMode}>
            Se connecter avec un mot de passe
          </button>
        )}
      </form>
    </AuthCard>
  )
}
