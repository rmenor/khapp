
'use client';

import { Info, Smartphone } from 'lucide-react';

import {
  Card,
  CardContent,
  CardHeader,
  CardTitle,
} from '@/components/ui/card';
import { Alert, AlertDescription } from '@/components/ui/alert';

export function PublicRequestForm() {
  return (
    <Card className="w-full max-w-lg shadow-md border-border/60">
      <CardHeader className="text-center space-y-3 pb-4">
        <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-primary/10 text-primary">
          <Smartphone className="h-6 w-6 text-primary" />
        </div>
        <CardTitle className="text-xl sm:text-2xl font-bold tracking-tight text-center">
          SOLICITUD PARA SER PRECURSOR AUXILIAR
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-4 pt-2">
        <Alert className="border-blue-200 bg-blue-50/50 text-blue-900 dark:border-blue-900/50 dark:bg-blue-950/30 dark:text-blue-200">
          <Info className="h-5 w-5 text-blue-600 dark:text-blue-400 shrink-0" />
          <AlertDescription className="text-base leading-relaxed pt-0.5">
            A partir de ahora la solicitud se hará desde la aplicación <strong>NW Publisher</strong>.
          </AlertDescription>
        </Alert>
      </CardContent>
    </Card>
  );
}

