'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ImportDropzone } from '@/components/finance/import-dropzone';
import { ImportPreviewView } from '@/components/finance/import-preview';
import { useToast } from '@/hooks/use-toast';
import type { ImportPreview } from '@/lib/finance/importer';

export interface ConceptOption {
  id: number;
  name: string;
}

export function ImportClient({
  concepts,
}: {
  concepts: ConceptOption[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [preview, setPreview] = useState<ImportPreview | null>(null);
  const [busy, setBusy] = useState(false);

  const confirm = async (
    overrides: { monthIndex: number; transactionIndex: number; conceptId: number | null }[],
    replace: boolean,
  ) => {
    if (!preview) return;

    setBusy(true);
    try {
      const response = await fetch('/api/finance/import/confirm', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ token: preview.token, replace, conceptOverrides: overrides }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'No se ha podido confirmar la importación',
          description: data.error ?? 'Error desconocido.',
        });
        return;
      }

      toast({
        title: 'Importación completada',
        description: data.result?.message ?? 'Los datos se han guardado.',
      });

      setPreview(null);
      router.refresh();
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al confirmar',
        description: error instanceof Error ? error.message : 'Error desconocido.',
      });
    } finally {
      setBusy(false);
    }
  };

  return (
    <>
      {preview ? (
        <ImportPreviewView
          preview={preview}
          concepts={concepts}
          onConfirm={confirm}
          onDiscard={() => setPreview(null)}
        />
      ) : (
        <ImportDropzone
          busy={busy}
          onPreview={(next) => {
            setPreview(next);
            if (next.failedFiles > 0) {
              toast({
                variant: 'destructive',
                title: 'Hay ficheros que no se han podido leer',
                description: 'Revisa los avisos en la vista previa.',
              });
            }
          }}
        />
      )}
    </>
  );
}
