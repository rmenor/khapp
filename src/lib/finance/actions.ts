'use server';

import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { verifySessionOrThrow } from '@/lib/actions';
import { getDb } from '@/lib/db/client';
import {
  createConcept,
  createRule,
  deleteConcept,
  deleteRule,
  listConcepts,
  resolveConcept,
  updateConcept,
  updateRule,
} from '@/lib/db/queries/concepts';

export interface ActionResult {
  success: boolean;
  message: string;
}

const ConceptSchema = z.object({
  name: z.string().min(1, 'El nombre es obligatorio').max(80),
  kind: z.enum(['income', 'expense', 'transfer']),
  category: z.string().max(40).optional().nullable(),
  ctCode: z.string().max(4).optional().nullable(),
});

const RuleSchema = z.object({
  pattern: z.string().min(1, 'El texto a buscar es obligatorio').max(120),
  conceptId: z.number().int().positive(),
  priority: z.number().int().optional(),
});

export async function saveConceptAction(
  data: z.infer<typeof ConceptSchema> & { id?: number },
): Promise<ActionResult> {
  await verifySessionOrThrow();

  const parsed = ConceptSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Datos no válidos' };
  }

  try {
    if (data.id) {
      updateConcept(data.id, parsed.data);
    } else {
      createConcept(parsed.data);
    }
    revalidatePath('/finance/conceptos');
    return { success: true, message: 'Concepto guardado.' };
  } catch (error) {
    return {
      success: false,
      message:
        error instanceof Error && error.message.includes('UNIQUE')
          ? 'Ya existe un concepto con ese nombre.'
          : 'No se ha podido guardar el concepto.',
    };
  }
}

export async function deleteConceptAction(id: number): Promise<ActionResult> {
  await verifySessionOrThrow();

  try {
    deleteConcept(id);
    revalidatePath('/finance/conceptos');
    return { success: true, message: 'Concepto eliminado.' };
  } catch {
    return { success: false, message: 'No se ha podido eliminar el concepto.' };
  }
}

export async function saveRuleAction(
  data: z.infer<typeof RuleSchema> & { id?: number },
): Promise<ActionResult> {
  await verifySessionOrThrow();

  const parsed = RuleSchema.safeParse(data);
  if (!parsed.success) {
    return { success: false, message: parsed.error.issues[0]?.message ?? 'Datos no válidos' };
  }

  try {
    if (data.id) {
      updateRule(data.id, { ...parsed.data, priority: parsed.data.priority ?? 0 });
    } else {
      createRule(parsed.data);
    }
    revalidatePath('/finance/conceptos');
    return { success: true, message: 'Regla guardada.' };
  } catch {
    return { success: false, message: 'No se ha podido guardar la regla.' };
  }
}

export async function deleteRuleAction(id: number): Promise<ActionResult> {
  await verifySessionOrThrow();

  try {
    deleteRule(id);
    revalidatePath('/finance/conceptos');
    return { success: true, message: 'Regla eliminada.' };
  } catch {
    return { success: false, message: 'No se ha podido eliminar la regla.' };
  }
}

/**
 * Vuelve a aplicar los conceptos y las reglas a todos los movimientos ya
 * importados. Es la forma de corregir la clasificación tras crear una regla
 * nueva, sin volver a subir los PDF.
 */
export async function reapplyConceptsAction(): Promise<ActionResult> {
  await verifySessionOrThrow();

  try {
    const db = getDb();
    const transactions = db
      .prepare('SELECT id, description, ct_code FROM transactions')
      .all() as { id: number; description: string; ct_code: string | null }[];

    const update = db.prepare('UPDATE transactions SET concept_id = ? WHERE id = ?');

    db.exec('BEGIN');
    try {
      for (const transaction of transactions) {
        const conceptId = resolveConcept(transaction.ct_code, transaction.description);
        update.run(conceptId, transaction.id);
      }
      db.exec('COMMIT');
    } catch (error) {
      db.exec('ROLLBACK');
      throw error;
    }

    revalidatePath('/finance/movimientos');
    revalidatePath('/finance/estadisticas');
    revalidatePath('/finance');

    return {
      success: true,
      message: `Se han reasignado los conceptos de ${transactions.length} movimientos.`,
    };
  } catch {
    return { success: false, message: 'No se han podido reaplicar los conceptos.' };
  }
}

export async function listConceptsAction() {
  await verifySessionOrThrow();
  return listConcepts();
}
