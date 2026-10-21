'use client';

import { useMemo } from 'react';
import { FileSpreadsheet, Printer } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import { Tooltip, TooltipContent, TooltipProvider, TooltipTrigger } from '@/components/ui/tooltip';
import { useSearchParams } from 'next/navigation';
import type { MovementRow } from '@/lib/finance/types';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

export function MovementsTable({
  movements,
  totals,
}: {
  movements: MovementRow[];
  totals: { income: number; expense: number; balance: number; count: number };
}) {
  const searchParams = useSearchParams();

  // El CSV se exporta con los mismos filtros que se están viendo.
  const csvHref = useMemo(() => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    const query = params.toString();
    return `/api/finance/movimientos.csv${query ? `?${query}` : ''}`;
  }, [searchParams]);

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between gap-2">
        <div>
          <CardTitle>Movimientos</CardTitle>
          <CardDescription>
            {totals.count} movimiento(s) · Entradas {formatCurrency(totals.income)} · Salidas{' '}
            {formatCurrency(totals.expense)} · Balance {formatCurrency(totals.balance)}
          </CardDescription>
        </div>
        <div className="flex gap-2 print:hidden">
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" asChild>
                  <a href={csvHref} download>
                    <FileSpreadsheet className="h-4 w-4" />
                    <span className="sr-only">Exportar a CSV</span>
                  </a>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar la vista filtrada a CSV</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
          <TooltipProvider>
            <Tooltip>
              <TooltipTrigger asChild>
                <Button variant="outline" size="icon" onClick={() => window.print()}>
                  <Printer className="h-4 w-4" />
                  <span className="sr-only">Exportar a PDF</span>
                </Button>
              </TooltipTrigger>
              <TooltipContent>
                <p>Exportar la vista filtrada a PDF</p>
              </TooltipContent>
            </Tooltip>
          </TooltipProvider>
        </div>
      </CardHeader>
      <CardContent>
        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Mes</TableHead>
              <TableHead>Día</TableHead>
              <TableHead>Descripción</TableHead>
              <TableHead>CT</TableHead>
              <TableHead>Concepto</TableHead>
              <TableHead>Cuenta</TableHead>
              <TableHead className="text-right">Entrada</TableHead>
              <TableHead className="text-right">Salida</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {movements.map((movement) => (
              <TableRow key={movement.id}>
                <TableCell className="whitespace-nowrap">
                  {MONTH_NAMES[movement.month - 1]} {movement.year}
                </TableCell>
                <TableCell>{movement.day ?? ''}</TableCell>
                <TableCell className="max-w-[360px] truncate" title={movement.description}>
                  {movement.description}
                </TableCell>
                <TableCell>{movement.ct_code ?? ''}</TableCell>
                <TableCell>
                  {movement.concept_name ? (
                    <Badge variant="secondary">{movement.concept_name}</Badge>
                  ) : (
                    <span className="text-muted-foreground">Sin clasificar</span>
                  )}
                </TableCell>
                <TableCell className="whitespace-nowrap">
                  {movement.account_from && movement.account_to
                    ? `${movement.account_from} → ${movement.account_to}`
                    : (movement.account_to ?? movement.account_from ?? '')}
                </TableCell>
                <TableCell className="text-right text-green-700">
                  {movement.inflow > 0 ? formatCurrency(movement.inflow) : ''}
                </TableCell>
                <TableCell className="text-right text-red-700">
                  {movement.outflow > 0 ? formatCurrency(movement.outflow) : ''}
                </TableCell>
              </TableRow>
            ))}
            {movements.length === 0 && (
              <TableRow>
                <TableCell colSpan={8} className="py-10 text-center text-muted-foreground">
                  No hay movimientos para este filtro.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
