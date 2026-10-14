interface LegacyKpiCardsProps {
  kpis: {
    netPoints: string
    entryCount: string
    playerCount: string
    manualShare: string
    topAction: string
    topActionPoints: string | null
  }
}

// Key indicators of the list below — they follow its filters.
export function LegacyKpiCards({ kpis }: LegacyKpiCardsProps) {
  const items = [
    { label: 'Points attribués (net)', value: kpis.netPoints },
    { label: 'Attributions', value: kpis.entryCount },
    { label: 'Joueurs concernés', value: kpis.playerCount },
    { label: 'Part manuelle', value: kpis.manualShare },
    { label: 'Action la plus rémunératrice', value: kpis.topAction, hint: kpis.topActionPoints },
  ]

  return (
    <dl className="grid grid-cols-2 gap-3 lg:grid-cols-5">
      {items.map((item) => (
        <div key={item.label} className="flex min-w-0 flex-col gap-1 rounded-2xl border bg-card p-4">
          <dt className="text-xs font-semibold tracking-wider text-muted-foreground uppercase">{item.label}</dt>
          <dd className="truncate text-xl font-extrabold text-foreground">{item.value}</dd>
          {item.hint && <dd className="text-xs text-muted-foreground">{item.hint}</dd>}
        </div>
      ))}
    </dl>
  )
}
