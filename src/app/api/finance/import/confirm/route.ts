import { NextResponse } from 'next/server';
import { z } from 'zod';
import { verifySession } from '@/lib/auth-session';
import { getStorageStatus } from '@/lib/db/client';
import { applyPreview } from '@/lib/finance/importer';
import { dropPreview, getPreview } from '@/lib/finance/preview-store';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

const ConfirmSchema = z.object({
  token: z.string().min(1),
  replace: z.boolean().optional(),
  /**
   * Ajustes manuales de la vista previa: el usuario puede corregir el
   * concepto de un movimiento antes de confirmar.
   */
  conceptOverrides: z
    .array(
      z.object({
        monthIndex: z.number().int().min(0),
        transactionIndex: z.number().int().min(0),
        conceptId: z.number().int().nullable(),
      }),
    )
    .optional(),
});

/**
 * Confirma una importación: escribe los meses en SQLite dentro de una
 * transacción y registra cada fichero por su hash. El PDF nunca se guarda.
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

  const storage = getStorageStatus();
  if (!storage.available) {
    return NextResponse.json(
      { error: storage.reason ?? 'La contabilidad local no está disponible en este entorno.' },
      { status: 503 },
    );
  }

  const body = await request.json().catch(() => null);
  const parsed = ConfirmSchema.safeParse(body);

  if (!parsed.success) {
    return NextResponse.json({ error: 'Datos de confirmación no válidos.' }, { status: 400 });
  }

  const preview = getPreview(parsed.data.token);
  if (!preview) {
    return NextResponse.json(
      { error: 'La vista previa ha caducado. Vuelve a subir los ficheros.' },
      { status: 410 },
    );
  }

  // Se aplican los ajustes manuales de concepto antes de escribir.
  for (const override of parsed.data.conceptOverrides ?? []) {
    const month = preview.months[override.monthIndex];
    const transaction = month?.transactions[override.transactionIndex];
    if (!transaction) continue;

    transaction.conceptId = override.conceptId;
    transaction.conceptName =
      override.conceptId === null
        ? null
        : (preview.conceptsById?.[override.conceptId] ?? null);
  }

  const result = applyPreview(preview, { replace: parsed.data.replace });

  if (!result.success) {
    return NextResponse.json({ error: result.message }, { status: 409 });
  }

  dropPreview(parsed.data.token);

  return NextResponse.json({ result });
}
