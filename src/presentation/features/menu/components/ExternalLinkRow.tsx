import { IconExternalLink } from '@tabler/icons-react'
import type { MenuExternalLink } from '../external-links'

interface ExternalLinkRowProps {
  link: MenuExternalLink
}

// specs/menu.md AC-MN-10 — visually marked as leaving the app (trailing
// external-link icon), opened without exposing the app's window context
// (`rel="noopener noreferrer"`), no personal data in the URL (there's
// nothing user-specific to put there in the first place). `url` is a
// placeholder pending PO-MN-03 — see ../external-links.ts.
export function ExternalLinkRow({ link }: ExternalLinkRowProps) {
  const IconComponent = link.icon

  return (
    <a
      href={link.url !== '' ? link.url : undefined}
      target="_blank"
      rel="noopener noreferrer"
      className="flex min-h-16 w-full items-center gap-3.5 rounded-3xl border border-white/10 bg-white/5 px-4.5 py-4"
    >
      <span aria-hidden className="flex size-11 shrink-0 items-center justify-center rounded-full bg-white/10">
        <IconComponent className="size-5.5 text-white" />
      </span>

      <span className="flex min-w-0 flex-1 flex-col gap-0.5">
        <span className="truncate text-[15px] font-bold text-white">{link.title}</span>
        <span className="truncate text-[12.5px] text-white/60">{link.subtitle}</span>
      </span>

      {link.url !== '' && <span aria-hidden className="flex size-8 shrink-0 items-center justify-center rounded-full border border-white/15">
        <IconExternalLink className="size-4 text-white/70" />
      </span>}
    </a>
  )
}
