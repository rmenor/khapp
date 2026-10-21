import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  ShareBarChart,
  SharePieChart,
} from '@/components/finance/finance-charts';
import {
  conceptShares,
  monthlyAverages,
  monthlyAggregates,
  quarterlyAggregates,
  yearOverYear,
  yearlyAggregates,
} from '@/lib/db/queries/stats';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

export default function EstadisticasPage() {
  const monthly = monthlyAggregates();
  const quarterly = quarterlyAggregates();
  const yearly = yearlyAggregates();
  const yoy = yearOverYear();
  const averages = monthlyAverages();
  const incomeShares = conceptShares('income');
  const expenseShares = conceptShares('expense');

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Estadísticas</h1>
        <p className="text-sm text-muted-foreground">
          Agregados de los informes mensuales importados (S-30) y de los movimientos (S-26).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Ingresos mensuales (media)"
          value={formatCurrency(averages.averageIncome)}
          hint={`Mediana: ${formatCurrency(averages.medianIncome)}`}
        />
        <StatCard
          label="Gastos mensuales (media)"
          value={formatCurrency(averages.averageExpense)}
          hint={`Mediana: ${formatCurrency(averages.medianExpense)}`}
        />
        <StatCard
          label="Meses analizados"
          value={String(averages.count)}
          hint="Meses importados"
        />
        <StatCard
          label="Total ingresos"
          value={formatCurrency(yearly.reduce((sum, year) => sum + year.income, 0))}
          hint="Suma de todos los años"
        />
      </div>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Reparto de los ingresos por concepto</CardTitle>
            <CardDescription>Porcentaje de cada concepto sobre el total de ingresos.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {incomeShares.length > 0 ? (
              <SharePieChart
                data={incomeShares.map((share) => ({
                  name: share.conceptName,
                  value: share.total,
                }))}
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Reparto de los gastos por concepto</CardTitle>
            <CardDescription>Porcentaje de cada concepto sobre el total de gastos.</CardDescription>
          </CardHeader>
          <CardContent className="pl-2">
            {expenseShares.length > 0 ? (
              <ShareBarChart
                data={expenseShares.map((share) => ({
                  name: share.conceptName,
                  value: share.total,
                }))}
              />
            ) : (
              <EmptyState />
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Agregado mensual</CardTitle>
          <CardDescription>Ingresos, gastos y balance de cada mes.</CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Gastos</TableHead>
                <TableHead className="text-right">Balance</TableHead>
                <TableHead className="text-right">Saldo final</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {monthly.map((month) => (
                <TableRow key={month.key}>
                  <TableCell className="font-medium">
                    {MONTH_NAMES[month.month - 1]} {month.year}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(month.income)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.expense)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.balance)}</TableCell>
                  <TableCell className="text-right">{formatCurrency(month.closingBalance)}</TableCell>
                </TableRow>
              ))}
              {monthly.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No hay meses importados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>

      <div className="grid gap-4 lg:grid-cols-2">
        <Card>
          <CardHeader>
            <CardTitle>Agregado trimestral</CardTitle>
            <CardDescription>Totales de cada trimestre.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Trimestre</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {quarterly.map((period) => (
                  <TableRow key={period.key}>
                    <TableCell className="font-medium">{period.label}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.income)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.expense)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.balance)}</TableCell>
                  </TableRow>
                ))}
                {quarterly.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                      No hay datos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>

        <Card>
          <CardHeader>
            <CardTitle>Agregado anual</CardTitle>
            <CardDescription>Totales de cada año.</CardDescription>
          </CardHeader>
          <CardContent>
            <Table>
              <TableHeader>
                <TableRow>
                  <TableHead>Año</TableHead>
                  <TableHead className="text-right">Meses</TableHead>
                  <TableHead className="text-right">Ingresos</TableHead>
                  <TableHead className="text-right">Gastos</TableHead>
                  <TableHead className="text-right">Balance</TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {yearly.map((period) => (
                  <TableRow key={period.key}>
                    <TableCell className="font-medium">{period.label}</TableCell>
                    <TableCell className="text-right">{period.count}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.income)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.expense)}</TableCell>
                    <TableCell className="text-right">{formatCurrency(period.balance)}</TableCell>
                  </TableRow>
                ))}
                {yearly.length === 0 && (
                  <TableRow>
                    <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                      No hay datos.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader>
          <CardTitle>Comparación con el mismo mes del año anterior</CardTitle>
          <CardDescription>
            Diferencia entre cada mes y el mes equivalente del año anterior.
          </CardDescription>
        </CardHeader>
        <CardContent>
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Mes</TableHead>
                <TableHead className="text-right">Ingresos</TableHead>
                <TableHead className="text-right">Año anterior</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
                <TableHead className="text-right">Gastos</TableHead>
                <TableHead className="text-right">Año anterior</TableHead>
                <TableHead className="text-right">Diferencia</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {yoy.map((row) => (
                <TableRow key={row.key}>
                  <TableCell className="font-medium">
                    {MONTH_NAMES[row.month - 1]} {row.year}
                  </TableCell>
                  <TableCell className="text-right">{formatCurrency(row.income)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(row.previousIncome)}
                  </TableCell>
                  <DifferenceCell value={row.incomeDifference} />
                  <TableCell className="text-right">{formatCurrency(row.expense)}</TableCell>
                  <TableCell className="text-right text-muted-foreground">
                    {formatCurrency(row.previousExpense)}
                  </TableCell>
                  <DifferenceCell value={row.expenseDifference} />
                </TableRow>
              ))}
              {yoy.length === 0 && (
                <TableRow>
                  <TableCell colSpan={7} className="py-10 text-center text-muted-foreground">
                    No hay meses importados.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>
        </CardContent>
      </Card>
    </div>
  );
}

function StatCard({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint?: string;
}) {
  return (
    <Card>
      <CardHeader className="pb-2">
        <CardTitle className="text-sm font-medium">{label}</CardTitle>
      </CardHeader>
      <CardContent>
        <div className="text-2xl font-bold">{value}</div>
        {hint && <p className="text-xs text-muted-foreground">{hint}</p>}
      </CardContent>
    </Card>
  );
}

function DifferenceCell({ value }: { value: number }) {
  const differs = Math.abs(value) > 0.01;
  return (
    <TableCell
      className={`text-right font-medium ${differs ? 'text-foreground' : 'text-muted-foreground'}`}
    >
      {formatCurrency(value)}
    </TableCell>
  );
}

function EmptyState() {
  return (
    <p className="py-10 text-center text-sm text-muted-foreground">
      No hay datos suficientes para mostrar el reparto.
    </p>
  );
}
