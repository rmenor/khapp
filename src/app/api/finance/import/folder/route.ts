import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { NextResponse } from 'next/server';
import { verifySession } from '@/lib/auth-session';
import { buildPreview, type InputFile } from '@/lib/finance/importer';
import { savePreview } from '@/lib/finance/preview-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

/** Niveles de carpeta que se recorren al buscar PDF. */
const MAX_DEPTH = 3;

async function collectPdfs(directory: string, depth = 0): Promise<string[]> {
  if (depth > MAX_DEPTH) return [];

  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const fullPath = join(directory, entry.name);
    // Se ignoran las carpetas ocultas y las de sistema.
    if (entry.name.startsWith('.')) continue;

    if (entry.isDirectory()) {
      files.push(...(await collectPdfs(fullPath, depth + 1)));
    } else if (entry.isFile() && entry.name.toLowerCase().endsWith('.pdf')) {
      files.push(fullPath);
    }
  }

  return files;
}

/**
 * Importación en lote desde una carpeta local.
 *
 * La carpeta se lee **en modo lectura**: no se copia, no se mueve y no se
 * borra ningún fichero. Los PDF se cargan en memoria, se analizan y se
 * descartan.
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

  const body = await request.json().catch(() => null);
  const directory = typeof body?.directory === 'string' ? body.directory.trim() : '';

  if (!directory) {
    return NextResponse.json({ error: 'Indica la carpeta de informes.' }, { status: 400 });
  }

  const absolute = resolve(directory);

  let pdfPaths: string[];
  try {
    pdfPaths = await collectPdfs(absolute);
  } catch (error) {
    return NextResponse.json(
      {
        error:
          error instanceof Error
            ? `No se ha podido leer la carpeta: ${error.message}`
            : 'No se ha podido leer la carpeta.',
      },
      { status: 400 },
    );
  }

  if (pdfPaths.length === 0) {
    return NextResponse.json(
      { error: `No se ha encontrado ningún PDF en "${absolute}".` },
      { status: 400 },
    );
  }

  const files: InputFile[] = [];
  for (const path of pdfPaths) {
    const buffer = await readFile(path);
    files.push({ name: path.split('/').pop() ?? path, bytes: new Uint8Array(buffer) });
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
