import { HardDriveDownload, TriangleAlert } from 'lucide-react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import type { StorageStatus } from '@/lib/db/client';

/**
 * Aviso que se muestra cuando la base de datos local no está disponible.
 *
 * En Firebase App Hosting (Cloud Run) el sistema de ficheros es de solo
 * lectura, así que no se puede crear `data/contabilidad.db`. Es preferible
 * explicarlo con claridad a devolver un error 500 genérico.
 */
export function AccountingUnavailable({ status }: { status: StorageStatus }) {
  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Finanzas</h1>
        <p className="text-sm text-muted-foreground">
          La contabilidad local no está disponible en este entorno.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-600" />
            No hay almacenamiento local disponible
          </CardTitle>
          <CardDescription>
            La contabilidad se guarda en una base de datos SQLite en el disco del servidor. Aquí el
            disco es de solo lectura, así que no se puede crear el fichero.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div className="rounded-lg border p-3 text-sm">
            <p className="font-medium">Cómo resolverlo</p>
            <ul className="mt-2 list-disc space-y-1 pl-5 text-muted-foreground">
              <li>
                Ejecuta la aplicación donde sí haya disco: <code className="rounded bg-muted px-1">npm run dev</code>.
              </li>
              <li>
                O indica una ruta con espacio escribible mediante la variable{' '}
                <code className="rounded bg-muted px-1">CONTABILIDAD_DB_PATH</code>.
              </li>
            </ul>
          </div>

          {status.reason && (
            <pre className="overflow-x-auto rounded-lg bg-muted p-3 text-xs whitespace-pre-wrap">
              {status.reason}
            </pre>
          )}

          <p className="text-xs text-muted-foreground">
            Ruta configurada: <code className="rounded bg-muted px-1">{status.path}</code>
          </p>
        </CardContent>
      </Card>

      <p className="flex items-center gap-2 text-sm text-muted-foreground">
        <HardDriveDownload className="h-4 w-4" />
        El resto de la aplicación (publicadores, grupos, privilegios, solicitudes) no se ve afectado.
      </p>
    </div>
  );
}
