import { Link, Navigate } from 'react-router-dom'
import { AuthCard } from '../components/AuthCard'
import { formatRole } from '../../../shared/formatters/role-labels'
import { Alert, AlertDescription } from '../../../shared/components/ui/alert'
import { Badge } from '../../../shared/components/ui/badge'
import { Button, buttonVariants } from '../../../shared/components/ui/button'
import { CardDescription, CardTitle } from '../../../shared/components/ui/card'
import { Input } from '../../../shared/components/ui/input'
import { Label } from '../../../shared/components/ui/label'
import { Separator } from '../../../shared/components/ui/separator'
import { cn } from '../../../shared/lib/utils'
import { useUpdatePasswordViewModel } from './useUpdatePasswordViewModel'

const fieldInputClass =
  'h-auto rounded-[14px] border-auth-border bg-white px-4 py-3.25 text-[13.5px] text-auth-text placeholder:text-auth-text-muted focus-visible:border-auth-primary focus-visible:ring-0'
const submitButtonClass =
  'h-auto w-full rounded-full bg-auth-primary py-3.5 text-sm font-bold text-white hover:bg-auth-primary-hover disabled:bg-auth-disabled-bg disabled:text-auth-disabled-text'

export function UpdatePasswordPage() {
  const vm = useUpdatePasswordViewModel()

  if (vm.status === 'loading') return null
  if (vm.status === 'unauthenticated') return <Navigate to="/login" replace />

  if (vm.status === 'invalid-link') {
    return (
      <AuthCard>
        <span className="mx-auto flex size-12 items-center justify-center rounded-full border-2 border-auth-primary text-xl font-extrabold text-auth-primary">
          !
        </span>
        <CardTitle className="text-center text-[19px] font-extrabold text-auth-text">Lien invalide ou expiré</CardTitle>
        <CardDescription className="text-center text-[12.5px] leading-relaxed text-auth-text-muted">
          Ce lien n'est plus valide. Demandez-en un nouveau.
        </CardDescription>
        <Link to="/forgot-password" className={cn(buttonVariants(), submitButtonClass)}>
          Retour
        </Link>
      </AuthCard>
    )
  }

  return (
    <AuthCard>
      {vm.showWelcome && (
        <>
          <div className="flex flex-col gap-3">
            <CardTitle className="text-[19px] font-extrabold text-auth-text">Bonjour, {vm.fullName}</CardTitle>
            <CardDescription className="text-[12.5px] leading-relaxed text-auth-text-muted">
              Vous avez été invité(e) sur AS Caribbean en tant que :
            </CardDescription>
            <div className="mt-2.5 flex flex-wrap gap-1.5">
              {vm.roles.map((assignment) => (
                <Badge
                  key={assignment.role}
                  variant="outline"
                  className="rounded-full border-[1.3px] border-auth-primary px-2.75 py-1 text-[11.5px] font-bold text-auth-primary"
                >
                  {formatRole(assignment.role)}
                </Badge>
              ))}
            </div>
          </div>
          <Separator className="bg-auth-border" />
        </>
      )}

      <CardTitle className="text-[19px] font-extrabold text-auth-text">
        {vm.showWelcome ? 'Définir votre mot de passe' : 'Nouveau mot de passe'}
      </CardTitle>

      <form
        className="flex flex-col gap-3"
        onSubmit={(event) => {
          event.preventDefault()
          vm.submit()
        }}
      >
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="update-password-new" className="sr-only">
            Nouveau mot de passe
          </Label>
          <Input
            id="update-password-new"
            type="password"
            autoComplete="new-password"
            placeholder="Nouveau mot de passe"
            required
            minLength={8}
            value={vm.newPassword}
            onChange={(event) => vm.setNewPassword(event.target.value)}
            className={fieldInputClass}
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="update-password-confirm" className="sr-only">
            Confirmer le mot de passe
          </Label>
          <Input
            id="update-password-confirm"
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
        {vm.error && (
          <Alert variant="destructive" className="rounded-[14px] border-auth-primary bg-[oklch(96%_0.03_26)]">
            <AlertDescription className="text-[12.5px] text-[oklch(38%_0.15_26)]">{vm.error}</AlertDescription>
          </Alert>
        )}

        <Button type="submit" disabled={!vm.passwordsMatch || vm.isSubmitting} className={submitButtonClass}>
          {vm.isSubmitting ? 'Enregistrement…' : vm.showWelcome ? 'Continuer' : 'Réinitialiser le mot de passe'}
        </Button>
      </form>
    </AuthCard>
  )
}
