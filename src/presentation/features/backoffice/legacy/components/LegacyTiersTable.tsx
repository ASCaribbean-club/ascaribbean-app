import { Checkbox } from '@presentation/shared/components/ui/checkbox'
import { Input } from '@presentation/shared/components/ui/input'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import type { TierDraft } from '../useBackofficeLegacyViewModel'

interface LegacyTiersTableProps {
  rows: TierDraft[]
  editable: boolean
  onChange: (key: string, patch: Partial<TierDraft>) => void
}

// CLAUDE.md §6 — h-11 touch targets and min-w-0 on every cell input, so the
// numeric columns never overlap their neighbours at a narrow window.
const FIELD = 'h-11 min-w-0 rounded-xl'

export function LegacyTiersTable({ rows, editable, onChange }: LegacyTiersTableProps) {
  return (
    <Table>
      <TableHeader>
        <TableRow>
          <TableHead>Rang</TableHead>
          <TableHead>Nom</TableHead>
          <TableHead>Saisons min.</TableHead>
          <TableHead>Points min.</TableHead>
          <TableHead>Récompense</TableHead>
          <TableHead>Remise cotisation (%)</TableHead>
          <TableHead>À vie</TableHead>
        </TableRow>
      </TableHeader>
      <TableBody>
        {rows.map((row) => (
          <TableRow key={row.key}>
            <TableCell className="font-semibold">{row.rank}</TableCell>
            <TableCell>
              <Input
                aria-label={`Nom du palier ${row.rank}`}
                value={row.name}
                disabled={!editable}
                onChange={(event) => onChange(row.key, { name: event.target.value })}
                className={FIELD}
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label={`Saisons minimum du palier ${row.rank}`}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={row.minSeasons}
                disabled={!editable}
                onChange={(event) => onChange(row.key, { minSeasons: event.target.value })}
                className={FIELD}
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label={`Points minimum du palier ${row.rank}`}
                type="number"
                min="0"
                step="1"
                inputMode="numeric"
                value={row.minPoints}
                disabled={!editable}
                onChange={(event) => onChange(row.key, { minPoints: event.target.value })}
                className={FIELD}
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label={`Récompense du palier ${row.rank}`}
                value={row.rewardLabel}
                disabled={!editable}
                onChange={(event) => onChange(row.key, { rewardLabel: event.target.value })}
                className={FIELD}
              />
            </TableCell>
            <TableCell>
              <Input
                aria-label={`Remise du palier ${row.rank}`}
                type="number"
                min="0"
                max="100"
                step="1"
                inputMode="numeric"
                value={row.discountPercent}
                disabled={!editable}
                onChange={(event) => onChange(row.key, { discountPercent: event.target.value })}
                className={FIELD}
              />
            </TableCell>
            <TableCell>
              <Checkbox
                aria-label={`Remise à vie pour le palier ${row.rank}`}
                checked={row.discountLifetime}
                disabled={!editable}
                onCheckedChange={(checked) => onChange(row.key, { discountLifetime: checked === true })}
              />
            </TableCell>
          </TableRow>
        ))}
      </TableBody>
    </Table>
  )
}
