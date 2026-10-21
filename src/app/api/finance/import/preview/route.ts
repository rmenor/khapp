import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-session';
import { buildPreview, type InputFile } from '@/lib/finance/importer';
import { savePreview } from '@/lib/finance/preview-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/**
 * Importación de informes PDF.
 *
 * Los ficheros se reciben en memoria, se analizan y se descartan: no se
 * escribe nada en disco. La respuesta es la vista previa, que el usuario
 * revisa y edita antes de confirmar.
 */
export async function POST(request: Request) {
  const cookie = request.headers
    .get('cookie')
    ?.split(';')
    .map((part) => part.trim())
    .find((part) => part.startsWith('__session='))
    ?.slice('__session='.length);

  if (!(await verifySession(cookie))) {
    return NextResponse.json({ error: 'No autorizado.' }, { status: 401 });
  }

  let formData: FormData;
  try {
    formData = await request.formData();
  } catch {
    return NextResponse.json({ error: 'No se han recibido ficheros.' }, { status: 400 });
  }

  const entries = formData.getAll('files').filter((entry): entry is File => entry instanceof File);

  if (entries.length === 0) {
    return NextResponse.json({ error: 'No se ha seleccionado ningún PDF.' }, { status: 400 });
  }

  const files: InputFile[] = [];
  for (const entry of entries) {
    const buffer = await entry.arrayBuffer();
    files.push({ name: entry.name, bytes: new Uint8Array(buffer) });
  }

  try {
    const preview = await buildPreview(files);
    savePreview(preview);

    return NextResponse.json({ preview });
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : 'Error al analizar los PDF.' },
      { status: 500 },
    );
  }
}
