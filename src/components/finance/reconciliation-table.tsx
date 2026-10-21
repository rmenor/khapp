import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Badge } from '@/components/ui/badge';
import type { ReconciliationRow } from '@/lib/db/reconciliation';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Cuadre entre el resumen mensual (S-30) y el libro de movimientos (S-26).
 *
 * Cuando algo no cuadra, la diferencia se muestra en rojo: es preferible
 * enseñar el descuadre a ocultarlo.
 */
export function ReconciliationTable({ rows }: { rows: ReconciliationRow[] }) {
  if (rows.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Cuadre S-30 / S-26</CardTitle>
          <CardDescription>Todavía no hay meses importados.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const allBalanced = rows.every((row) => row.balanced);

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          Cuadre entre el resumen (S-30) y los movimientos (S-26)
          <Badge variant={allBalanced ? 'outline' : 'destructive'}>
            {allBalanced ? 'Todo cuadra' : `${rows.filter((r) => !r.balanced).length} mes(es) con diferencia`}
          </Badge>
        </CardTitle>
        <CardDescription>
          El saldo se calcula con el saldo inicial del S-30 y los movimientos del S-26. Tolerancia: 0,01 €.
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Ingresos S-30</TableHead>
              <TableHead className="text-right">Ingresos S-26</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead className="text-right">Gastos S-30</TableHead>
              <TableHead className="text-right">Gastos S-26</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
              <TableHead className="text-right">Saldo final</TableHead>
              <TableHead className="text-right">Saldo calculado</TableHead>
              <TableHead className="text-right">Diferencia</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {rows.map((row) => (
              <TableRow key={row.monthId}>
                <TableCell className="font-medium">
                  {MONTH_NAMES[row.month - 1]} {row.year}
                </TableCell>
                <TableCell className="text-right">{formatCurrency(row.summaryIncome)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.movementIncome)}</TableCell>
                <DifferenceCell value={row.incomeDifference} />
                <TableCell className="text-right">{formatCurrency(row.summaryExpense)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.movementExpense)}</TableCell>
                <DifferenceCell value={row.expenseDifference} />
                <TableCell className="text-right">{formatCurrency(row.closingBalance)}</TableCell>
                <TableCell className="text-right">{formatCurrency(row.calculatedBalance)}</TableCell>
                <DifferenceCell value={row.balanceDifference} />
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}

function DifferenceCell({ value }: { value: number }) {
  const differs = Math.abs(value) > 0.01;

  return (
    <TableCell
      className={`text-right font-medium ${differs ? 'text-destructive' : 'text-muted-foreground'}`}
    >
      {formatCurrency(value)}
    </TableCell>
  );
}
