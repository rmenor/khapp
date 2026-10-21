'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { TriangleAlert } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';

/**
 * Frontera de error del módulo de contabilidad.
 *
 * Es la red de seguridad para errores que no son de almacenamiento (por
 * ejemplo, un PDF con un formato inesperado). El caso del disco de solo
 * lectura se detecta antes, en el layout, para poder explicar la situación.
 */
export default function FinanceError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error('Error en el módulo de contabilidad:', error);
  }, [error]);

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Panel de Finanzas</h1>
        <p className="text-sm text-muted-foreground">
          No se ha podido cargar la contabilidad.
        </p>
      </div>

      <Card>
        <CardHeader>
          <CardTitle className="flex items-center gap-2">
            <TriangleAlert className="h-5 w-5 text-amber-600" />
            Se ha producido un error inesperado
          </CardTitle>
          <CardDescription>
            Revisa los registros del servidor para más detalle. El resto de la aplicación no se ve
            afectado.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          {error.digest && (
            <p className="text-xs text-muted-foreground">
              Referencia del error: <code className="rounded bg-muted px-1">{error.digest}</code>
            </p>
          )}

          <div className="flex gap-2">
            <Button onClick={reset}>Reintentar</Button>
            <Button variant="outline" asChild>
              <Link href="/dashboard">Ir al inicio</Link>
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
