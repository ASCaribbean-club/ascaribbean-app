import { Link } from 'react-router-dom'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import type { LedgerRowView } from '../useLegacyPointsViewModel'
import { useLegacyEntryConvocationViewModel } from '../useLegacyEntryConvocationViewModel'

interface LegacyEntryDetailProps {
  row: LedgerRowView
}

// The expanded panel of a ledger row: where these points come from.
export function LegacyEntryDetail({ row }: LegacyEntryDetailProps) {
  const { source } = row

  if (source.kind === 'convocation') {
    return source.convocationId ? (
      <ConvocationSource convocationId={source.convocationId} />
    ) : (
      <p className="text-sm text-muted-foreground">La convocation à l’origine de ces points a été supprimée ; l’entrée est conservée.</p>
    )
  }

  if (source.kind === 'season_end') {
    return <p className="text-sm text-muted-foreground">Bonus de fidélité attribué automatiquement à la fin de la saison.</p>
  }

  return (
    <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1 text-sm">
      <dt className="text-muted-foreground">Motif</dt>
      <dd className="font-medium whitespace-pre-line">{source.reason}</dd>
      <dt className="text-muted-foreground">Attribué par</dt>
      <dd>
        {source.authorName} · {source.createdOn}
      </dd>
      {source.correctsLabel && (
        <>
          <dt className="text-muted-foreground">Corrige</dt>
          <dd>{source.correctsLabel}</dd>
        </>
      )}
    </dl>
  )
}

function ConvocationSource({ convocationId }: { convocationId: string }) {
  const vm = useLegacyEntryConvocationViewModel(convocationId)

  if (vm.isLoading) return <Skeleton className="h-16 rounded-xl" />
  if (vm.error)
    return (
      <p role="alert" className="text-sm text-destructive">
        {vm.error}
      </p>
    )
  if (vm.isMissing || !vm.view) {
    return <p className="text-sm text-muted-foreground">Cette convocation n’existe plus ; l’entrée est conservée.</p>
  }

  return (
    <div className="flex flex-col gap-2 text-sm">
      <p className="font-semibold text-foreground">{vm.view.title}</p>
      <dl className="grid grid-cols-[auto_1fr] gap-x-4 gap-y-1">
        <dt className="text-muted-foreground">Date</dt>
        <dd>{vm.view.dateTimeLabel}</dd>
        <dt className="text-muted-foreground">Lieu</dt>
        <dd>{vm.view.locationLabel}</dd>
        {vm.view.attendanceLabel && (
          <>
            <dt className="text-muted-foreground">Présences</dt>
            <dd>{vm.view.attendanceLabel}</dd>
          </>
        )}
        {vm.view.fields.map((field) => (
          <div key={field.label} className="contents">
            <dt className="text-muted-foreground">{field.label}</dt>
            <dd>{field.value}</dd>
          </div>
        ))}
      </dl>
      <Link to={vm.view.href} className="w-fit font-semibold text-coach-green underline underline-offset-2">
        Voir la convocation et les présences
      </Link>
    </div>
  )
}
