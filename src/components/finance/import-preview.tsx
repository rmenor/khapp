'use client';

import { useState } from 'react';
import { AlertTriangle, CheckCircle2, FileWarning, Loader2, XCircle } from 'lucide-react';
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
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import type { ImportPreview, PreviewMonth } from '@/lib/finance/importer';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/** Ajuste manual del concepto de un movimiento de la vista previa. */
export interface ConceptOverride {
  monthIndex: number;
  transactionIndex: number;
  conceptId: number | null;
}

function formatCurrency(value: number): string {
  return new Intl.NumberFormat('es-ES', { style: 'currency', currency: 'EUR' }).format(value);
}

/**
 * Vista previa editable de lo extraído de los PDF.
 *
 * Se muestra el mes detectado, el número de movimientos, los totales y los
 * avisos, y se permite corregir el concepto de cada movimiento antes de
 * confirmar.
 */
export function ImportPreviewView({
  preview,
  concepts,
  onConfirm,
  onDiscard,
}: {
  preview: ImportPreview;
  concepts: { id: number; name: string }[];
  onConfirm: (overrides: ConceptOverride[], replace: boolean) => Promise<void>;
  onDiscard: () => void;
}) {
  const [busy, setBusy] = useState(false);
  const [overrides, setOverrides] = useState<Record<string, string>>({});
  const [replace, setReplace] = useState(preview.existingMonths.length > 0);

  const hasDuplicates = preview.existingMonths.length > 0 || preview.duplicateHashes.length > 0;

  const confirm = async () => {
    setBusy(true);
    try {
      const conceptOverrides = Object.entries(overrides).map(([key, value]) => {
        const [monthIndex, transactionIndex] = key.split('-').map(Number);
        return {
          monthIndex,
          transactionIndex,
          conceptId: value === '' ? null : Number(value),
        };
      });

      await onConfirm(conceptOverrides, replace);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Vista previa</CardTitle>
          <CardDescription>
            Revisa lo que se ha extraído antes de confirmar. Todavía no se ha escrito nada en la
            base de datos.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="grid gap-2 sm:grid-cols-4">
            <Stat label="Ficheros" value={String(preview.totalFiles)} />
            <Stat label="Meses detectados" value={String(preview.months.length)} />
            <Stat label="Ignorados" value={String(preview.ignoredFiles)} />
            <Stat
              label="Con error"
              value={String(preview.failedFiles)}
              tone={preview.failedFiles > 0 ? 'danger' : 'default'}
            />
          </div>

          {hasDuplicates && (
            <div className="flex items-start gap-3 rounded-lg border border-amber-500/50 bg-amber-500/10 p-3">
              <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
              <div className="text-sm">
                <p className="font-medium">Este mes ya está importado</p>
                <p className="text-muted-foreground">
                  {preview.existingMonths.length > 0 &&
                    `Ya existen los meses ${preview.existingMonths
                      .map((m) => `${MONTH_NAMES[m.month - 1]} ${m.year}`)
                      .join(', ')} en la base de datos.`}
                  {preview.duplicateHashes.length > 0 &&
                    ' Además, algunos ficheros son idénticos a otros ya importados.'}
                </p>
                <label className="mt-2 flex cursor-pointer items-center gap-2">
                  <input
                    type="checkbox"
                    checked={replace}
                    onChange={(event) => setReplace(event.target.checked)}
                    className="h-4 w-4 rounded border-input"
                  />
                  Reemplazar los datos existentes de esos meses
                </label>
              </div>
            </div>
          )}

          {preview.warnings.length > 0 && (
            <ul className="flex flex-col gap-1 rounded-lg border p-3 text-sm">
              {preview.warnings.map((warning, index) => (
                <li key={index} className="flex items-start gap-2">
                  {warning.level === 'error' ? (
                    <XCircle className="mt-0.5 h-4 w-4 shrink-0 text-destructive" />
                  ) : (
                    <AlertTriangle className="mt-0.5 h-4 w-4 shrink-0 text-amber-600" />
                  )}
                  <span>{warning.message}</span>
                </li>
              ))}
            </ul>
          )}

          <div className="flex flex-col gap-2">
            <h3 className="text-sm font-semibold">Ficheros analizados</h3>
            <ul className="flex flex-col gap-1 text-sm">
              {preview.files.map((file) => (
                <li key={file.hash} className="flex items-center gap-2">
                  {file.status === 'ok' ? (
                    <CheckCircle2 className="h-4 w-4 shrink-0 text-green-600" />
                  ) : file.status === 'ignored' ? (
                    <FileWarning className="h-4 w-4 shrink-0 text-muted-foreground" />
                  ) : (
                    <XCircle className="h-4 w-4 shrink-0 text-destructive" />
                  )}
                  <span className="font-medium">{file.name}</span>
                  <Badge variant="outline">{file.docType}</Badge>
                  {file.year && file.month && (
                    <span className="text-muted-foreground">
                      {MONTH_NAMES[file.month - 1]} {file.year}
                    </span>
                  )}
                  {file.status !== 'ok' && (
                    <span className="text-muted-foreground">{file.message ?? file.reason}</span>
                  )}
                </li>
              ))}
            </ul>
          </div>
        </CardContent>
      </Card>

      {preview.months.map((month, monthIndex) => (
        <MonthPreviewCard
          key={`${month.year}-${month.month}`}
          month={month}
          monthIndex={monthIndex}
          concepts={concepts}
          overrides={overrides}
          onOverride={(transactionIndex, conceptId) => {
            setOverrides((current) => ({
              ...current,
              [`${monthIndex}-${transactionIndex}`]: conceptId,
            }));
          }}
        />
      ))}

      <div className="flex flex-wrap gap-2">
        <Button onClick={() => void confirm()} disabled={busy || preview.months.length === 0}>
          {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
          Confirmar importación
        </Button>
        <Button variant="outline" onClick={onDiscard} disabled={busy}>
          Cancelar
        </Button>
      </div>
    </div>
  );
}

function MonthPreviewCard({
  month,
  monthIndex,
  concepts,
  overrides,
  onOverride,
}: {
  month: PreviewMonth;
  monthIndex: number;
  concepts: { id: number; name: string }[];
  overrides: Record<string, string>;
  onOverride: (transactionIndex: number, conceptId: string) => void;
}) {
  const totalIn = month.transactions.reduce((sum, t) => sum + t.inflow, 0);
  const totalOut = month.transactions.reduce((sum, t) => sum + t.outflow, 0);

  return (
    <Card>
      <CardHeader>
        <CardTitle>
          {MONTH_NAMES[month.month - 1]} {month.year}
        </CardTitle>
        <CardDescription>
          {month.transactions.length} movimiento(s) · {month.congregation ?? 'Sin congregación'}
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        <div className="grid gap-2 sm:grid-cols-4">
          <Stat label="Movimientos" value={String(month.transactions.length)} />
          <Stat label="Entradas (S-26)" value={formatCurrency(totalIn)} />
          <Stat label="Salidas (S-26)" value={formatCurrency(totalOut)} />
          <Stat
            label="Ingresos (S-30)"
            value={formatCurrency(month.incomeTotal)}
            tone={month.incomeTotal !== 0 && totalIn !== 0 && Math.abs(month.incomeTotal - totalIn) > 0.01 ? 'danger' : 'default'}
          />
        </div>

        {month.transactions.length > 0 && (
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Día</TableHead>
                <TableHead>Descripción</TableHead>
                <TableHead>CT</TableHead>
                <TableHead>Cuenta</TableHead>
                <TableHead className="text-right">Entrada</TableHead>
                <TableHead className="text-right">Salida</TableHead>
                <TableHead>Concepto</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {month.transactions.map((transaction, transactionIndex) => {
                const key = `${monthIndex}-${transactionIndex}`;
                const current = overrides[key] ?? (transaction.conceptId?.toString() ?? '');

                return (
                  <TableRow key={transaction.lineNo}>
                    <TableCell>{transaction.day ?? ''}</TableCell>
                    <TableCell className="max-w-[320px] truncate" title={transaction.description}>
                      {transaction.description}
                    </TableCell>
                    <TableCell>{transaction.ctCode ?? ''}</TableCell>
                    <TableCell>
                      {transaction.isTransfer
                        ? `${transaction.accountFrom} → ${transaction.accountTo}`
                        : (transaction.accountTo ?? transaction.accountFrom ?? '')}
                    </TableCell>
                    <TableCell className="text-right text-green-700">
                      {transaction.inflow > 0 ? formatCurrency(transaction.inflow) : ''}
                    </TableCell>
                    <TableCell className="text-right text-red-700">
                      {transaction.outflow > 0 ? formatCurrency(transaction.outflow) : ''}
                    </TableCell>
                    <TableCell>
                      <Select
                        value={current}
                        onValueChange={(value) => onOverride(transactionIndex, value)}
                      >
                        <SelectTrigger className="h-8 w-[180px]">
                          <SelectValue placeholder="Sin clasificar" />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="">Sin clasificar</SelectItem>
                          {concepts.map((concept) => (
                            <SelectItem key={concept.id} value={String(concept.id)}>
                              {concept.name}
                            </SelectItem>
                          ))}
                        </SelectContent>
                      </Select>
                    </TableCell>
                  </TableRow>
                );
              })}
            </TableBody>
          </Table>
        )}
      </CardContent>
    </Card>
  );
}

function Stat({
  label,
  value,
  tone = 'default',
}: {
  label: string;
  value: string;
  tone?: 'default' | 'danger';
}) {
  return (
    <div className="rounded-lg border p-3">
      <p className="text-xs text-muted-foreground">{label}</p>
      <p
        className={`text-lg font-semibold ${tone === 'danger' ? 'text-destructive' : ''}`}
      >
        {value}
      </p>
    </div>
  );
}
