interface BackofficeBrandMarkProps {
  subtitle?: string
  // 'stacked' (default): logo above the wordmark, centered — the login card
  // and the two full-screen fallback states. 'inline': logo beside a
  // two-line text block, left-aligned — the sidebar header in
  // `[Admin] Web - Dashboard-3.png`, sitting above the 5 nav entries.
  variant?: 'stacked' | 'inline'
}

// The app icon (public/icons/icon-512.png) + "AS Caribbean" wordmark,
// sitting above the login card in `[Admin] Web - Connexion-1.png` and, in
// its inline variant, at the top of the sidebar in
// `[Admin] Web - Dashboard-3.png`.
// Reused as-is (not redrawn) on the two full-screen fallback states this
// feature also needs (BackofficeAccessDeniedPage, BackofficeDesktopOnlyPage)
// — none of the 4 mockups cover those screens, so anchoring them to the same
// brand mark keeps them feeling like the same product rather than
// improvised one-offs. `subtitle` defaults to the mockup's "Espace admin";
// pass an empty string to omit it (used by the two fallback screens, which
// have their own heading right below).
export function BackofficeBrandMark({ subtitle = 'Espace admin', variant = 'stacked' }: BackofficeBrandMarkProps) {
  const logoSize = variant === 'stacked' ? 'size-14' : 'size-10'
  const logo = <img src="/icons/icon-512.png" alt="" aria-hidden className={`${logoSize} shrink-0 rounded-full object-cover`} />

  if (variant === 'inline') {
    return (
      <div className="flex items-center gap-3">
        {logo}
        <div className="flex flex-col leading-tight">
          <span className="text-sm font-extrabold text-foreground">AS Caribbean</span>
          {subtitle && <span className="text-xs text-muted-foreground">{subtitle}</span>}
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col items-center gap-3">
      {logo}
      <span className="text-lg font-extrabold text-foreground">AS Caribbean</span>
      {subtitle && <span className="text-sm text-muted-foreground">{subtitle}</span>}
    </div>
  )
}
