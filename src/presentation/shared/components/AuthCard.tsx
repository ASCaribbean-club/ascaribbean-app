import type { PropsWithChildren, ReactNode } from 'react'

interface AuthCardProps extends PropsWithChildren {
  title?: ReactNode
  subtitle?: ReactNode
  brand?: boolean
}

export function AuthCard({ title, subtitle, brand, children }: AuthCardProps) {
  return (
    <div className="auth-shell">
      {brand && (
        <div className="auth-shell__brand">
          <div className="auth-shell__brand-mark" />
          <span className="auth-shell__brand-name">AS Caribbean</span>
        </div>
      )}
      <div className="auth-card">
        {title && <h1 className="auth-card__title">{title}</h1>}
        {subtitle && <p className="auth-card__subtitle">{subtitle}</p>}
        {children}
      </div>
    </div>
  )
}
