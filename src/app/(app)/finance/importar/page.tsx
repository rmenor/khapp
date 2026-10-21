import { ImportClient } from '@/components/finance/import-client';
import { ImportHistory } from '@/components/finance/import-history';
import { listConcepts } from '@/lib/db/queries/concepts';

export const dynamic = 'force-dynamic';

export default function ImportPage() {
  const concepts = listConcepts().map((concept) => ({
    id: concept.id,
    name: concept.name,
  }));

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Importar informes</h1>
        <p className="text-sm text-muted-foreground">
          Sube los informes mensuales en PDF. Los ficheros se procesan en memoria y se descartan:
          no queda ninguna copia en el disco.
        </p>
      </div>

      <ImportClient concepts={concepts} />
      <ImportHistory />
    </div>
  );
}
