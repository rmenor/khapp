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
import { getDb, plainRows } from '@/lib/db/client';
import type { ImportRecord } from '@/lib/finance/types';

function formatDate(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return value;
  return date.toLocaleString('es-ES');
}

/**
 * Historial de importaciones: qué fichero se ha importado, cuándo y con qué
 * resultado. Solo se guardan el hash, el nombre, la fecha y el número de
 * filas: nunca el PDF.
 */
export function ImportHistory() {
  const db = getDb();
  const records = plainRows<ImportRecord & { year: number | null; month: number | null }>(
    db
      .prepare(
        `SELECT i.*, m.year, m.month FROM imports i
         LEFT JOIN months m ON m.id = i.month_id
         ORDER BY i.imported_at DESC`,
      )
      .all(),
  );

  if (records.length === 0) {
    return (
      <Card>
        <CardHeader>
          <CardTitle>Historial de importaciones</CardTitle>
          <CardDescription>Todavía no se ha importado ningún fichero.</CardDescription>
        </CardHeader>
      </Card>
    );
  }

  const failed = records.filter((record) => record.status === 'error');

  return (
    <Card>
      <CardHeader>
        <CardTitle>Historial de importaciones</CardTitle>
        <CardDescription>
          Se guarda el hash, el nombre del fichero, la fecha y el número de filas. El PDF nunca se
          conserva.
        </CardDescription>
      </CardHeader>
      <CardContent className="flex flex-col gap-4">
        {failed.length > 0 && (
          <div className="rounded-lg border border-destructive/40 bg-destructive/5 p-3">
            <p className="text-sm font-medium text-destructive">
              {failed.length} fichero(s) no se han podido importar
            </p>
            <ul className="mt-1 flex flex-col gap-1 text-sm">
              {failed.map((record) => (
                <li key={record.id}>
                  <span className="font-medium">{record.filename}</span>: {record.warnings}
                </li>
              ))}
            </ul>
          </div>
        )}

        <Table>
          <TableHeader>
            <TableRow>
              <TableHead>Fichero</TableHead>
              <TableHead>Documento</TableHead>
              <TableHead>Mes</TableHead>
              <TableHead className="text-right">Filas</TableHead>
              <TableHead>Fecha</TableHead>
              <TableHead>Estado</TableHead>
            </TableRow>
          </TableHeader>
          <TableBody>
            {records.map((record) => (
              <TableRow key={record.id}>
                <TableCell className="font-medium">{record.filename}</TableCell>
                <TableCell>{record.doc_type ?? '—'}</TableCell>
                <TableCell>
                  {record.year && record.month ? `${record.month}/${record.year}` : '—'}
                </TableCell>
                <TableCell className="text-right">{record.rows}</TableCell>
                <TableCell>{formatDate(record.imported_at)}</TableCell>
                <TableCell>
                  <Badge variant={record.status === 'error' ? 'destructive' : 'outline'}>
                    {record.status === 'error' ? 'Error' : 'Importado'}
                  </Badge>
                </TableCell>
              </TableRow>
            ))}
          </TableBody>
        </Table>
      </CardContent>
    </Card>
  );
}
