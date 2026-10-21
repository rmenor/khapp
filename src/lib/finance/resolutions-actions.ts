'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifySessionOrThrow } from '@/lib/actions';
import { getDb } from '@/lib/db/client';
import type { Resolution } from '@/lib/finance/types';

export interface ActionResult {
  success: boolean;
  message: string;
}

const ResolutionSchema = z.object({
  description: z.string().min(1, 'La descripción es obligatoria').max(120),
  amount: z.coerce.number().positive('El importe debe ser mayor que cero'),
  startDate: z.string().min(1, 'La fecha es obligatoria'),
});

export async function listResolutionsAction(): Promise<Resolution[]> {
  await verifySessionOrThrow();

  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM resolutions ORDER BY is_active DESC, start_date DESC')
    .all() as {
    id: number;
    description: string;
    amount: number;
    start_date: string;
    is_active: number;
  }[];

  return rows.map((row) => ({
    id: row.id,
    description: row.description,
    amount: row.amount,
    start_date: row.start_date,
    is_active: row.is_active === 1,
  }));
}

export async function addResolutionAction(
  data: z.infer<typeof ResolutionSchema>,
): Promise<ActionResult> {
  await verifySessionOrThrow();

  const parsed = ResolutionSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Datos no válidos' };
  }

  try {
    const db = getDb();
    db.prepare(
      'INSERT INTO resolutions (description, amount, start_date, is_active) VALUES (?, ?, ?, 1)',
    ).run(parsed.data.description, parsed.data.amount, parsed.data.startDate);

    revalidatePath('/finance');
    return { success: true, message: 'Resolución añadida.' };
  } catch {
    return { success: false, message: 'No se ha podido añadir la resolución.' };
  }
}

/**
 * Una resolución no se borra: se desactiva, para conservar el histórico.
 */
export async function deleteResolutionAction(id: number): Promise<ActionResult> {
  await verifySessionOrThrow();

  try {
    const db = getDb();
    db.prepare('UPDATE resolutions SET is_active = 0 WHERE id = ?').run(id);

    revalidatePath('/finance');
    return { success: true, message: 'Resolución desactivada.' };
  } catch {
    return { success: false, message: 'No se ha podido desactivar la resolución.' };
  }
}
