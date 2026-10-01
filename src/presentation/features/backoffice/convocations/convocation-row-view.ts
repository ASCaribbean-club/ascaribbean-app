import type { AdminConvocationListItem } from '@domain/entities/admin-convocation'
import type { ConvocationType } from '@domain/entities/convocation'
import {
  adminConvocationDisplayStatus,
  canEnterAttendance,
  isAttendancePending,
  isConvocationEditable,
  type AdminConvocationDisplayStatus,
} from '@domain/policies/convocation-admin-windows'
import { getConvocationLocationAddress, getConvocationLocationLabel } from '@domain/rules/convocation-location'
import { formatConvocationType } from '@presentation/shared/formatters/convocation-labels'
import { formatConvocationDateTime, formatConvocationTime } from './format-convocation-date'

// specs/web-create-convocation.md UI design "Ligne dépliable" — everything a
// row and its panel display, already assembled (zero business logic left to
// the components). Pure: `now` is passed in.
export type PanelField = { label: string; value: string } | { label: string; items: string[]; emptyLabel: string }

export type ConvocationAttendanceView =
  | { kind: 'none' } // upcoming or cancelled -> "—" (AC-WC-08)
  | { kind: 'pending' } // past and still open -> "Présences non saisies"
  | { kind: 'counts'; present: number; absent: number; unrecorded: number } // closed

export interface ConvocationRowView {
  id: string
  teamName: string
  type: ConvocationType
  typeLabel: string
  // ISO instant, for the calendar view's day placement.
  startsAt: string
  dateTimeLabel: string
  locationLabel: string
  status: AdminConvocationDisplayStatus
  attendance: ConvocationAttendanceView
  // Present / absent / not-yet-recorded counts of AttendanceRecord, for any
  // past, non-cancelled convocation (pending or closed); null otherwise.
  attendanceSummary: { present: number; absent: number; unrecorded: number } | null
  // AC-WC-12 — the pencil exists only for an upcoming, open convocation.
  canEdit: boolean
  // AC-WC-12 — attendance entry exists only for a past, non-cancelled one.
  attendanceLinkLabel: string | null
  panelFields: PanelField[]
}

const NOT_PROVIDED = 'Non renseigné'

function buildPanelFields(item: AdminConvocationListItem): PanelField[] {
  const { convocation } = item
  // Team and type: plain text, never presented as editable (UI design).
  const fields: PanelField[] = [
    { label: 'Équipe', value: item.teamName },
    { label: 'Type', value: formatConvocationType(convocation.type) },
    { label: 'Créée par', value: item.creatorName ?? '—' },
  ]

  if (convocation.type === 'training') {
    const address = getConvocationLocationAddress(convocation)
    const name = getConvocationLocationLabel(convocation)
    fields.push({
      label: 'Lieu d’entraînement',
      value: address ? `${name} — ${address}` : name || '—',
    })
  }

  if (convocation.type === 'match' && item.match) {
    const { match } = item
    const rdvTime = match.meetingPointTime ? formatConvocationTime(match.meetingPointTime) : NOT_PROVIDED
    const rdvLocation = match.meetingPointLocation ?? NOT_PROVIDED
    fields.push(
      { label: 'Adversaire', value: match.opponentName ?? '—' },
      {
        label: 'Domicile / Extérieur',
        value: match.isHome ? 'Domicile' : 'Extérieur',
      },
      { label: 'Lieu', value: convocation.location ?? '—' },
      { label: 'RDV', value: `${rdvTime} · ${rdvLocation}` },
    )
  }

  if (convocation.type === 'meeting' && item.meeting) {
    fields.push(
      { label: 'Titre', value: item.meeting.title },
      { label: 'Lieu', value: convocation.location ?? '—' },
      {
        label: 'Ordre du jour',
        items: item.meeting.agenda,
        emptyLabel: 'Aucun point',
      },
    )
  }

  return fields
}

export function toConvocationRowView(item: AdminConvocationListItem, now: Date): ConvocationRowView {
  const { convocation } = item

  let attendance: ConvocationAttendanceView = { kind: 'none' }
  if (convocation.status === 'closed') {
    attendance = {
      kind: 'counts',
      present: item.attendance.present,
      absent: item.attendance.absent,
      unrecorded: Math.max(0, item.attendance.rosterSize - item.attendance.present - item.attendance.absent),
    }
  } else if (isAttendancePending(convocation, now)) {
    attendance = { kind: 'pending' }
  }

  const attendanceSummary =
    attendance.kind === 'none'
      ? null
      : {
          present: item.attendance.present,
          absent: item.attendance.absent,
          unrecorded: Math.max(0, item.attendance.rosterSize - item.attendance.present - item.attendance.absent),
        }

  return {
    id: convocation.id,
    teamName: item.teamName,
    type: convocation.type,
    typeLabel: formatConvocationType(convocation.type),
    startsAt: convocation.date,
    dateTimeLabel: formatConvocationDateTime(convocation.date),
    locationLabel: getConvocationLocationLabel(convocation) || '—',
    status: adminConvocationDisplayStatus(convocation, now),
    attendance,
    attendanceSummary,
    canEdit: isConvocationEditable(convocation, now),
    attendanceLinkLabel: canEnterAttendance(convocation, now)
      ? convocation.status === 'closed'
        ? 'Voir / modifier les présences'
        : 'Saisir les présences'
      : null,
    panelFields: buildPanelFields(item),
  }
}
