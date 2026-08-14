import { Link, Navigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { formatRole } from '../../../shared/formatters/role-labels'
import { useUpdatePasswordViewModel } from './useUpdatePasswordViewModel'

export function UpdatePasswordPage() {
  const vm = useUpdatePasswordViewModel()
  

  if (vm.status === 'loading') return null
  if (vm.status === 'unauthenticated') return <Navigate to="/login" replace />

  if (vm.status === 'invalid-link') {
    return (
      <AuthCard>
        <span className="auth-status-icon">!</span>
        <h1 className="auth-card__title auth-text-center">Lien invalide ou expiré</h1>
        <p className="auth-card__subtitle auth-text-center">Ce lien n'est plus valide. Demandez-en un nouveau.</p>
        <Link to="/forgot-password" className="auth-button">
          Retour
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      {vm.showWelcome && (
        <>
          <div className="auth-card__section">
            <p className="auth-card__title">Bonjour, {vm.fullName}</p>
            <p className="auth-card__subtitle">Vous avez été invité(e) sur AS Caribbean en tant que :</p>
            <div className="auth-role-chips">
              {vm.roles.map((assignment) => (
                <span key={assignment.role} className="auth-role-chip">
                  {formatRole(assignment.role)}
                </span>
              ))}
            </div>
          </div>
          <hr className="auth-card__divider" />
        </>
      )}

      <h1 className="auth-card__title">{vm.showWelcome ? 'Définir votre mot de passe' : 'Nouveau mot de passe'}</h1>

      <form
        className="auth-form"
        onSubmit={(event) => {
          event.preventDefault()
          vm.submit()
        }}
      >
        <div className="auth-field">
          <label htmlFor="update-password-new" className="sr-only">
            Nouveau mot de passe
          </label>
          <input
            id="update-password-new"
            type="password"
            autoComplete="new-password"
            placeholder="Nouveau mot de passe"
            required
            minLength={8}
            value={vm.newPassword}
            onChange={(event) => vm.setNewPassword(event.target.value)}
          />
        </div>

        <div className="auth-field">
          <label htmlFor="update-password-confirm" className="sr-only">
            Confirmer le mot de passe
          </label>
          <input
            id="update-password-confirm"
            type="password"
            autoComplete="new-password"
            placeholder="Confirmer le mot de passe"
            required
            minLength={8}
            value={vm.confirmPassword}
            onChange={(event) => vm.setConfirmPassword(event.target.value)}
          />
        </div>

        {vm.confirmPassword.length > 0 && !vm.passwordsMatch && (
          <p className="auth-alert auth-alert--error" role="alert">
            Les mots de passe ne correspondent pas.
          </p>
        )}
        {vm.error && (
          <p className="auth-alert auth-alert--error" role="alert">
            {vm.error}
          </p>
        )}

        <button type="submit" className="auth-button" disabled={!vm.passwordsMatch || vm.isSubmitting}>
          {vm.isSubmitting ? 'Enregistrement…' : vm.showWelcome ? 'Continuer' : 'Réinitialiser le mot de passe'}
        </button>
      </form>
    </AuthCard>
  )
}
