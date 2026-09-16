import { IconShieldOff } from '@tabler/icons-react'
import { Link } from 'react-router-dom'
import { BackofficeBrandMark } from '@presentation/features/backoffice/components/BackofficeBrandMark'

// AC-WE-09: rendered INSTEAD OF the dashboard shell for a session that
// passed RequireBackofficeSession (a real Supabase session exists) but
// fails RequireBackofficeAccess (the role gate) — see that guard,
// presentation/app/RequireBackofficeAccess.tsx, the only call site. Chosen
// over a redirect: bouncing an already-authenticated account back to
// /admin/login would look like a broken login loop, not a clear refusal.
//
// No mockup for this screen (specs/web-empty-state.md: "Pas de maquette
// fournie... proposition minimale") — kept visually consistent with
// BackofficeLoginPage (same dark palette, same brand mark) rather than
// improvised independently.
export function BackofficeAccessDeniedPage() {
  return (
    <div className="dark flex min-h-svh flex-col items-center justify-center gap-6 bg-background px-6 py-16 text-center font-backoffice text-foreground antialiased">
      <BackofficeBrandMark subtitle="" />
      <IconShieldOff className="size-10 text-muted-foreground" aria-hidden />
      <div className="flex flex-col gap-1.5">
        <h1 className="text-xl font-bold">Accès non autorisé</h1>
        <p className="max-w-sm text-sm text-muted-foreground">
          Le backoffice AS Caribbean est réservé aux comptes administrateurs invités.
        </p>
      </div>
      {/* Back to the mobile app, per the spec — no "changer de compte" or
          sign-out link invented here beyond what the app already offers
          elsewhere (ProfilePage). */}
      <Link to="/" className="text-sm font-semibold text-coach-green-link underline underline-offset-4">
        Retour à l’application
      </Link>
    </div>
  )
}
