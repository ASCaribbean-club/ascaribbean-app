import type { PropsWithChildren, ReactNode } from 'react'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '../../../shared/components/ui/card'

interface AuthCardProps extends PropsWithChildren {
  title?: ReactNode
  subtitle?: ReactNode
  brand?: boolean
}

export function AuthCard({ title, subtitle, brand, children }: AuthCardProps) {
  return (
    // min-h-full (not min-h-svh/dvh): this div sits directly under #root,
    // which is already pinned full-screen — see the cold-start note in
    // global.css. A *vh unit here reintroduces the same bug standalone.
    <div className="flex min-h-full flex-col items-center justify-center gap-7 bg-auth-bg px-6 py-12 font-auth antialiased">
      {brand && (
        <div className="flex flex-col items-center gap-3">
          <div className="size-14 rounded-full bg-[conic-gradient(oklch(45%_0.16_152)_0deg_180deg,var(--color-auth-primary)_180deg_360deg)]" />
          <span className="text-[17px] font-extrabold text-auth-text">AS Caribbean</span>
        </div>
      )}
      <Card className="w-full max-w-[360px] gap-4 rounded-3xl bg-white p-6.5 py-7 text-inherit shadow-[0_1px_3px_rgba(0,0,0,0.06),0_8px_20px_rgba(0,0,0,0.06)]">
        {(title || subtitle) && (
          <CardHeader className="gap-1 p-0">
            {title && <CardTitle className="text-[19px] font-extrabold text-auth-text">{title}</CardTitle>}
            {subtitle && (
              <CardDescription className="text-[12.5px] leading-relaxed text-auth-text-muted">{subtitle}</CardDescription>
            )}
          </CardHeader>
        )}
        <CardContent className="flex flex-col gap-4 p-0">{children}</CardContent>
      </Card>
    </div>
  )
}
