import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Button } from '@presentation/shared/components/ui/button'
import { Card, CardContent } from '@presentation/shared/components/ui/card'
import { Input } from '@presentation/shared/components/ui/input'
import { Label } from '@presentation/shared/components/ui/label'
import { BackofficeBrandMark } from '@presentation/features/backoffice/components/BackofficeBrandMark'
import { useBackofficeLoginViewModel } from './useBackofficeLoginViewModel'

// `[Admin] Web - Connexion-1.png`, reproduced closely with ONE deliberate
// omission: the mockup's "Mot de passe oublié ?" link is NOT rendered — not
// even as a disabled/inert placeholder (AC-WE-03). specs/web-empty-state.md
// is explicit about why: "Cette zone de la maquette n'a aucune destination
// dans cette feature". PO-WE-07 (report vs. permanent decision for this gap)
// stays open — nothing to build here either way in this pass.
//
// `dark` class on the wrapper (not a route-level/global toggle): scopes
// shadcn's already-defined `.dark` palette (global.css) to just this
// screen's subtree. This mockup's dark theme reuses that palette plus the
// existing coach-green/coach-red brand tokens instead of introducing a
// third fixed palette next to auth-*/coach-* — see the comment on
// BackofficeDashboardLayout for the fuller reasoning, which applies here
// too.
export function BackofficeLoginPage() {
  const vm = useBackofficeLoginViewModel()

  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center gap-8 bg-background px-6 py-16 font-backoffice text-foreground antialiased">
      <BackofficeBrandMark />

      <Card className="w-full max-w-[420px] gap-5 rounded-2xl">
        <CardContent>
          <form
            className="flex flex-col gap-4"
            onSubmit={(event) => {
              event.preventDefault()
              vm.submit()
            }}
          >
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="admin-email" className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">
                Email
              </Label>
              {/* h-11 (44px, CLAUDE.md §6): even though the backoffice is
                  desktop-first (souris/clavier), a touchscreen laptop is
                  still a desktop for PO-WE-09's purposes — shadcn's
                  un-adjusted h-8 default isn't overridden for a mobile-only
                  reason here, but the same mechanic. */}
              <Input
                id="admin-email"
                type="email"
                autoComplete="email"
                placeholder="admin@ascaribbean.com"
                required
                disabled={vm.isSubmitting}
                value={vm.email}
                onChange={(event) => vm.setEmail(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            <div className="flex flex-col gap-1.5">
              <Label
                htmlFor="admin-password"
                className="text-xs font-semibold tracking-wider text-muted-foreground uppercase"
              >
                Mot de passe
              </Label>
              <Input
                id="admin-password"
                type="password"
                autoComplete="current-password"
                required
                disabled={vm.isSubmitting}
                value={vm.password}
                onChange={(event) => vm.setPassword(event.target.value)}
                className="h-11 rounded-xl"
              />
            </div>

            {vm.errorMessage && (
              <Alert variant="destructive" className="rounded-xl" role="alert">
                <AlertDescription>{vm.errorMessage}</AlertDescription>
              </Alert>
            )}

            {/* type="submit" + native <form>: Entrée soumet depuis
                n'importe quel champ, tabulation naturelle Email → Mot de
                passe → Se connecter, focus visible via le
                focus-visible:ring-3 déjà présent sur Input/Button —
                AC-WE-21, sans style de focus custom à écrire. */}
            <Button
              type="submit"
              disabled={vm.isSubmitting}
              className="h-11 w-full rounded-full bg-coach-green font-bold text-white hover:bg-coach-green disabled:opacity-60"
            >
              {vm.isSubmitting ? 'Connexion…' : 'Se connecter'}
            </Button>
          </form>
        </CardContent>
      </Card>

      <p className="max-w-[420px] text-center text-xs text-muted-foreground">
        Accès réservé aux comptes administrateurs invités.
      </p>
    </div>
  )
}
