'use client';

import { useCallback, useRef, useState } from 'react';
import { FileText, FolderOpen, Loader2, Upload } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { useToast } from '@/hooks/use-toast';
import type { ImportPreview } from '@/lib/finance/importer';

/**
 * Zona de arrastrar y soltar para los PDF.
 *
 * Los ficheros se leen en el navegador y se envían al servidor, que los
 * procesa en memoria. No se guardan en ningún sitio.
 */
export function ImportDropzone({
  onPreview,
  busy,
}: {
  onPreview: (preview: ImportPreview) => void;
  busy: boolean;
}) {
  const { toast } = useToast();
  const inputRef = useRef<HTMLInputElement>(null);
  const [dragging, setDragging] = useState(false);
  const [folderPath, setFolderPath] = useState('');

  const sendFiles = useCallback(
    async (files: File[]) => {
      if (files.length === 0) return;

      const pdfs = files.filter((file) => file.name.toLowerCase().endsWith('.pdf'));
      if (pdfs.length === 0) {
        toast({
          variant: 'destructive',
          title: 'Solo se admiten PDF',
          description: 'Los informes mensuales son documentos PDF.',
        });
        return;
      }

      const formData = new FormData();
      for (const file of pdfs) {
        formData.append('files', file, file.name);
      }

      try {
        const response = await fetch('/api/finance/import/preview', {
          method: 'POST',
          body: formData,
        });

        const data = await response.json();

        if (!response.ok) {
          toast({
            variant: 'destructive',
            title: 'No se han podido analizar los PDF',
            description: data.error ?? 'Error desconocido.',
          });
          return;
        }

        onPreview(data.preview as ImportPreview);
      } catch (error) {
        toast({
          variant: 'destructive',
          title: 'Error al enviar los ficheros',
          description: error instanceof Error ? error.message : 'Error desconocido.',
        });
      }
    },
    [onPreview, toast],
  );

  const importFolder = useCallback(async () => {
    if (!folderPath.trim()) return;

    try {
      const response = await fetch('/api/finance/import/folder', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ directory: folderPath.trim() }),
      });

      const data = await response.json();

      if (!response.ok) {
        toast({
          variant: 'destructive',
          title: 'No se ha podido leer la carpeta',
          description: data.error ?? 'Error desconocido.',
        });
        return;
      }

      onPreview(data.preview as ImportPreview);
    } catch (error) {
      toast({
        variant: 'destructive',
        title: 'Error al leer la carpeta',
        description: error instanceof Error ? error.message : 'Error desconocido.',
      });
    }
  }, [folderPath, onPreview, toast]);

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Importar informes mensuales</CardTitle>
          <CardDescription>
            Arrastra aquí los PDF (S-26 y S-30) o selecciónalos. Se procesan en memoria: no se
            guardan en el disco ni se envían a ningún servicio externo.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <div
            onDragOver={(event) => {
              event.preventDefault();
              setDragging(true);
            }}
            onDragLeave={() => setDragging(false)}
            onDrop={(event) => {
              event.preventDefault();
              setDragging(false);
              void sendFiles(Array.from(event.dataTransfer.files));
            }}
            className={`flex flex-col items-center justify-center gap-3 rounded-lg border-2 border-dashed p-10 text-center transition-colors ${
              dragging ? 'border-primary bg-accent' : 'border-muted-foreground/30'
            }`}
          >
            {busy ? (
              <Loader2 className="h-8 w-8 animate-spin text-muted-foreground" />
            ) : (
              <FileText className="h-8 w-8 text-muted-foreground" />
            )}
            <div>
              <p className="font-medium">Arrastra los PDF aquí</p>
              <p className="text-sm text-muted-foreground">
                Se aceptan varios a la vez. Los ficheros que no sean S-26 ni S-30 se ignoran.
              </p>
            </div>
            <Button
              type="button"
              variant="outline"
              onClick={() => inputRef.current?.click()}
              disabled={busy}
            >
              <Upload className="mr-2 h-4 w-4" />
              Seleccionar ficheros
            </Button>
            <input
              ref={inputRef}
              type="file"
              accept="application/pdf,.pdf"
              multiple
              className="hidden"
              onChange={(event) => {
                void sendFiles(Array.from(event.target.files ?? []));
                event.target.value = '';
              }}
            />
          </div>

          <div className="flex flex-col gap-2 rounded-lg border p-4 sm:flex-row sm:items-end">
            <div className="flex-1">
              <label htmlFor="folder-path" className="mb-1 block text-sm font-medium">
                Importar una carpeta completa
              </label>
              <Input
                id="folder-path"
                value={folderPath}
                onChange={(event) => setFolderPath(event.target.value)}
                placeholder="Ruta de la carpeta con los informes (modo lectura)"
              />
              <p className="mt-1 text-xs text-muted-foreground">
                La carpeta se lee sin copiar, mover ni borrar nada.
              </p>
            </div>
            <Button
              type="button"
              variant="secondary"
              onClick={() => void importFolder()}
              disabled={busy || !folderPath.trim()}
            >
              <FolderOpen className="mr-2 h-4 w-4" />
              Importar carpeta
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
