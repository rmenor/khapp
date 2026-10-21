import { verifySession } from '@/lib/auth-session';
import { listMovements, parseFilters } from '@/lib/db/queries/transactions';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

function csvCell(value: string | number | null): string {
  if (value === null || value === undefined) return '';
  const text = String(value);
  if (/[";\n]/.test(text)) return `"${text.replace(/"/g, '""')}"`;
  return text;
}

/**
 * Exporta a CSV la vista filtrada de movimientos.
 *
 * Reutiliza los mismos filtros que la pantalla, de modo que el fichero
 * exportado corresponde exactamente a lo que se está viendo.
 */
export async function GET(request: Request) {
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('__session='))
    ?.slice('__session='.length);

  if (!(await verifySession(cookie))) {
    return new Response('No autorizado.', { status: 401 });
  }

  const url = new URL(request.url);
  const filters = parseFilters(
    Object.fromEntries(url.searchParams.entries()) as Record<string, string>,
  );

  const movements = listMovements(filters);

  const header = [
    'Mes',
    'Año',
    'Día',
    'Descripción',
    'Código CT',
    'Concepto',
    'Cuenta origen',
    'Cuenta destino',
    'Entrada',
    'Salida',
  ];

  const rows = movements.map((movement) => [
    `${movement.month}/${movement.year}`,
    movement.year,
    movement.day ?? '',
    movement.description,
    movement.ct_code ?? '',
    movement.concept_name ?? 'Sin clasificar',
    movement.account_from ?? '',
    movement.account_to ?? '',
    movement.inflow.toFixed(2).replace('.', ','),
    movement.outflow.toFixed(2).replace('.', ','),
  ]);

  const csv = [header, ...rows].map((row) => row.map(csvCell).join(';')).join('\n');

  // BOM para que Excel reconozca UTF-8.
  const body = `﻿${csv}`;

  return new Response(body, {
    headers: {
      'Content-Type': 'text/csv; charset=utf-8',
      'Content-Disposition': 'attachment; filename="movimientos-contabilidad.csv"',
    },
  });
}
