import Link from 'next/link';
import { ArrowDownLeft, ArrowUpRight, Landmark, PiggyBank, Scale } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { MonthSelector } from '@/components/finance/month-selector';
import { PeriodLabel } from '@/components/finance/period-label';
import { BalanceEvolutionChart, MonthlyTotalsChart } from '@/components/finance/finance-charts';
import { ReconciliationTable } from '@/components/finance/reconciliation-table';
import { buildReconciliation } from '@/lib/db/reconciliation';
import { listMonthTotals, countMonthMovements } from '@/lib/db/queries/months';

export const dynamic = 'force-dynamic';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Panel de finanzas: cifras del mes seleccionado y evolución.
 *
 * Todas las cifras indican su mes y su documento de origen: el resumen
 * (S-30) y el libro de movimientos (S-26).
 */
export default async function FinanceSummaryPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const months = listMonthTotals();
  const reconciliation = buildReconciliation();

  const yearParam = typeof params.year === 'string' ? Number(params.year) : undefined;
  const monthParam = typeof params.month === 'string' ? Number(params.month) : undefined;

  // Por defecto se muestra el último mes importado.
  const selectedYear = yearParam ?? months[months.length - 1]?.year;
  const selectedMonth = monthParam ?? months[months.length - 1]?.month;

  const selected = months.find(
    (month) => month.year === selectedYear && month.month === selectedMonth,
  );

  const income = selected?.income_total ?? 0;
  const expense = selected?.expense_total ?? 0;
  const balance = income - expense;
  const variation = selected ? selected.closing_balance - selected.opening_balance : 0;

  const chartData = months.map((month) => ({
    month: `${MONTH_NAMES[month.month - 1]} ${String(month.year).slice(2)}`,
    income: month.income_total,
    expenses: month.expense_total,
    balance: month.closing_balance,
  }));

  const balanceData = months.map((month) => ({
    month: `${MONTH_NAMES[month.month - 1]} ${String(month.year).slice(2)}`,
    income: month.income_total,
    expenses: month.expense_total,
    balance: month.closing_balance,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Panel de Finanzas</h1>
          <p className="text-sm text-muted-foreground">
            Datos importados de los informes mensuales (S-26 y S-30).
          </p>
        </div>
        <div className="flex flex-col items-start gap-2 sm:items-end">
          <MonthSelector
            months={months}
            selectedYear={selectedYear}
            selectedMonth={selectedMonth}
          />
          <PeriodLabel period={{ year: selectedYear, months: selectedMonth ? [selectedMonth] : [] }} />
        </div>
      </div>

      {months.length === 0 ? (
        <Card>
          <CardHeader>
            <CardTitle>Todavía no hay datos importados</CardTitle>
            <CardDescription>
              Sube los informes mensuales en PDF para empezar. Los ficheros se procesan en memoria y no
              se guardan en el disco.
            </CardDescription>
          </CardHeader>
          <CardContent>
            <Button asChild>
              <Link href="/finance/importar">Importar informes</Link>
            </Button>
          </CardContent>
        </Card>
      ) : (
        <>
          <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
            <KpiCard
              title="Ingresos del mes"
              description="Total de ingresos (S-30)"
              value={formatCurrency(income)}
              icon={<ArrowUpRight className="h-4 w-4 text-green-600" />}
              valueClass="text-green-700"
            />
            <KpiCard
              title="Gastos del mes"
              description="Total de desembolsos (S-30)"
              value={formatCurrency(expense)}
              icon={<ArrowDownLeft className="h-4 w-4 text-red-600" />}
              valueClass="text-red-700"
            />
            <KpiCard
              title="Balance del mes"
              description="Ingresos menos gastos"
              value={formatCurrency(balance)}
              icon={<Scale className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Saldo final"
              description="Fondos al final del mes (S-30)"
              value={formatCurrency(selected?.closing_balance ?? 0)}
              icon={<PiggyBank className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <div className="grid gap-4 md:grid-cols-3">
            <KpiCard
              title="Saldo inicial"
              description="Fondos al comienzo del mes (S-30)"
              value={formatCurrency(selected?.opening_balance ?? 0)}
              icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Variación del mes"
              description="Saldo final menos saldo inicial"
              value={formatCurrency(variation)}
              icon={<ArrowUpRight className="h-4 w-4 text-muted-foreground" />}
            />
            <KpiCard
              title="Movimientos"
              description="Líneas del libro de cuentas (S-26)"
              value={String(selected ? countMonthMovements(selected.id) : 0)}
              icon={<Landmark className="h-4 w-4 text-muted-foreground" />}
            />
          </div>

          <div className="grid gap-4 lg:grid-cols-2">
            <Card>
              <CardHeader>
                <CardTitle>Ingresos y gastos por mes</CardTitle>
                <CardDescription>Totales del informe mensual (S-30).</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <MonthlyTotalsChart data={chartData} />
              </CardContent>
            </Card>
            <Card>
              <CardHeader>
                <CardTitle>Evolución del saldo</CardTitle>
                <CardDescription>Fondos al final de cada mes (S-30).</CardDescription>
              </CardHeader>
              <CardContent className="pl-2">
                <BalanceEvolutionChart data={balanceData} />
              </CardContent>
            </Card>
          </div>

          <ReconciliationTable rows={reconciliation} />
        </>
      )}
    </div>
  );
}

function KpiCard({
  title,
  description,
  value,
  icon,
  valueClass,
}: {
  title: string;
  description: string;
  value: string;
  icon: React.ReactNode;
  valueClass?: string;
}) {
  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0 pb-2">
        <CardTitle className="text-sm font-medium">{title}</CardTitle>
        {icon}
      </CardHeader>
      <CardContent>
        <div className={`text-2xl font-bold ${valueClass ?? ''}`}>{value}</div>
        <p className="text-xs text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}
