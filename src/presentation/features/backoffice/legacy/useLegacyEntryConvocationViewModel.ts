import { useQuery } from '@tanstack/react-query'
import { useLegacyDependencies } from '@presentation/di/hooks/use-legacy-dependencies'
import { toConvocationRowView } from '@presentation/features/backoffice/convocations/convocation-row-view'
import { mapDomainErrorToUiError } from '@presentation/shared/errors/map-domain-error-to-ui-error'
import { queryKeys } from '@presentation/shared/query-keys'

// The convocation that produced an automatic entry, read ONLY when the row is
// expanded (one query per opened row, never one per row of the list). A plain
// passthrough read through the DI-provided repository, same precedent as the
// seasons list: RLS (admin reads every convocation) is the authority.
// Reuses the backoffice convocations row view, so the labels and the panel
// fields read exactly as on /admin/convocations.
export function useLegacyEntryConvocationViewModel(convocationId: string) {
  const { adminConvocationRepository } = useLegacyDependencies()

  const query = useQuery({
    queryKey: queryKeys.legacyEntryConvocation(convocationId),
    queryFn: () => adminConvocationRepository.findById(convocationId),
  })

  const view = query.data ? toConvocationRowView(query.data, new Date()) : null

  return {
    isLoading: query.isLoading,
    error: query.error ? mapDomainErrorToUiError(query.error).message : null,
    // null once loaded = the convocation no longer exists.
    isMissing: query.isSuccess && query.data === null,
    view: view && {
      title: `${view.typeLabel} · ${view.teamName}`,
      dateTimeLabel: view.dateTimeLabel,
      locationLabel: view.locationLabel,
      attendanceLabel: view.attendanceSummary
        ? `${view.attendanceSummary.present} présent${view.attendanceSummary.present > 1 ? 's' : ''} · ${view.attendanceSummary.absent} absent${view.attendanceSummary.absent > 1 ? 's' : ''}`
        : null,
      // Simple label/value fields only (opponent, venue, ...); list fields stay on the convocation screen.
      fields: view.panelFields.flatMap((field) => ('value' in field ? [field] : [])),
      href: `/admin/convocations/${convocationId}/attendance`,
    },
  }
}
