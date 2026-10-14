import { Alert, AlertDescription } from '@presentation/shared/components/ui/alert'
import { Badge } from '@presentation/shared/components/ui/badge'
import { Skeleton } from '@presentation/shared/components/ui/skeleton'
import { Table, TableBody, TableCell, TableHead, TableHeader, TableRow } from '@presentation/shared/components/ui/table'
import type { RuleValidity } from '@domain/policies/legacy-rules'
import { useLegacyRulesViewModel } from '../useLegacyRulesViewModel'

const VALIDITY_LABEL: Record<RuleValidity, string> = {
  current: 'En vigueur',
  upcoming: 'À venir',
  ended: 'Terminée',
}

// "Référentiel" tab — which action earns how many points. Every version is
// listed; the status is text, never colour alone. Read-only.
export function LegacyRulesTab() {
  const vm = useLegacyRulesViewModel()

  if (vm.isLoading) return <Skeleton className="h-64 rounded-xl" />

  if (vm.error) {
    return (
      <Alert variant="destructive" role="alert">
        <AlertDescription>{vm.error.message}</AlertDescription>
      </Alert>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <p className="max-w-3xl text-sm text-muted-foreground">
        Points attribués par action. Un changement de barème crée une nouvelle version : les points déjà attribués ne bougent jamais. Les
        actions automatiques viennent de la présence validée par le coach ; les actions manuelles sont attribuées par un dirigeant habilité,
        avec un motif.
      </p>
      <Table>
        <TableHeader>
          <TableRow>
            <TableHead>Action</TableHead>
            <TableHead>Attribution</TableHead>
            <TableHead>Discipline</TableHead>
            <TableHead>Points</TableHead>
            <TableHead>Motif obligatoire</TableHead>
            <TableHead>Période</TableHead>
            <TableHead>Statut</TableHead>
          </TableRow>
        </TableHeader>
        <TableBody>
          {vm.rows.map((row) => (
            <TableRow key={row.id}>
              <TableCell className="font-semibold whitespace-normal">{row.action}</TableCell>
              <TableCell>{row.channel}</TableCell>
              <TableCell>{row.teamType}</TableCell>
              <TableCell className="font-semibold">{row.points}</TableCell>
              <TableCell>{row.reasonRequired ? 'Oui' : 'Non'}</TableCell>
              <TableCell className="whitespace-normal">{row.period}</TableCell>
              <TableCell>
                <Badge variant={row.validity === 'current' ? 'default' : 'outline'}>{VALIDITY_LABEL[row.validity]}</Badge>
              </TableCell>
            </TableRow>
          ))}
        </TableBody>
      </Table>
    </div>
  )
}
