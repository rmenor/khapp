import { Suspense } from 'react';
import { FinanceFilters } from '@/components/finance/finance-filters';
import { MovementsTable } from '@/components/finance/movements-table';
import { PeriodLabel } from '@/components/finance/period-label';
import { listConcepts } from '@/lib/db/queries/concepts';
import {
  listCtCodes,
  listMovements,
  listYears,
  movementTotals,
  parseFilters,
} from '@/lib/db/queries/transactions';

export const dynamic = 'force-dynamic';

export default async function MovimientosPage({
  searchParams,
}: {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}) {
  const params = await searchParams;
  const filters = parseFilters(params);

  const movements = listMovements(filters);
  const totals = movementTotals(filters);

  const years = listYears();
  const concepts = listConcepts().map((concept) => ({ id: concept.id, name: concept.name }));
  const ctCodes = listCtCodes();

  return (
    <div className="flex flex-col gap-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h1 className="text-2xl font-bold tracking-tight">Movimientos</h1>
          <p className="text-sm text-muted-foreground">
            Todos los movimientos importados del libro de cuentas (S-26).
          </p>
        </div>
        <PeriodLabel
          period={{
            year: filters.year,
            months: filters.months,
            quarter: filters.quarter,
          }}
        />
      </div>

      <Suspense fallback={null}>
        <FinanceFilters years={years} concepts={concepts} ctCodes={ctCodes} />
      </Suspense>

      <MovementsTable movements={movements} totals={totals} />
    </div>
  );
}
