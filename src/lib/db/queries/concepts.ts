import { getDb, plainRow, plainRows } from '@/lib/db/client';
import type { Concept, ConceptRule } from '@/lib/finance/types';

export function listConcepts(): Concept[] {
  const db = getDb();
  return plainRows<Concept>(db.prepare('SELECT * FROM concepts ORDER BY name').all());
}

export function getConcept(id: number): Concept | undefined {
  const db = getDb();
  return plainRow<Concept>(db.prepare('SELECT * FROM concepts WHERE id = ?').get(id));
}

export function getConceptByName(name: string): Concept | undefined {
  const db = getDb();
  return plainRow<Concept>(db.prepare('SELECT * FROM concepts WHERE name = ?').get(name));
}

export function createConcept(input: {
  name: string;
  kind: Concept['kind'];
  category?: string | null;
  ctCode?: string | null;
}): number {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO concepts (name, kind, category, ct_code) VALUES (?, ?, ?, ?)')
    .run(input.name, input.kind, input.category ?? null, input.ctCode ?? null);
  return Number(result.lastInsertRowid);
}

export function updateConcept(
  id: number,
  input: {
    name: string;
    kind: Concept['kind'];
    category?: string | null;
    ctCode?: string | null;
  },
): void {
  const db = getDb();
  db.prepare(
    'UPDATE concepts SET name = ?, kind = ?, category = ?, ct_code = ? WHERE id = ?',
  ).run(input.name, input.kind, input.category ?? null, input.ctCode ?? null, id);
}

export function deleteConcept(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM concepts WHERE id = ?').run(id);
}

export function listRules(): (ConceptRule & { concept_name: string })[] {
  const db = getDb();
  return plainRows<ConceptRule & { concept_name: string }>(
    db
      .prepare(
        `SELECT r.id, r.pattern, r.concept_id, r.priority, c.name AS concept_name
           FROM concept_rules r
           JOIN concepts c ON c.id = r.concept_id
           ORDER BY r.priority, r.id`,
      )
      .all(),
  );
}

export function createRule(input: {
  pattern: string;
  conceptId: number;
  priority?: number;
}): number {
  const db = getDb();
  const result = db
    .prepare('INSERT INTO concept_rules (pattern, concept_id, priority) VALUES (?, ?, ?)')
    .run(input.pattern, input.conceptId, input.priority ?? 0);
  return Number(result.lastInsertRowid);
}

export function updateRule(
  id: number,
  input: { pattern: string; conceptId: number; priority: number },
): void {
  const db = getDb();
  db.prepare('UPDATE concept_rules SET pattern = ?, concept_id = ?, priority = ? WHERE id = ?').run(
    input.pattern,
    input.conceptId,
    input.priority,
    id,
  );
}

export function deleteRule(id: number): void {
  const db = getDb();
  db.prepare('DELETE FROM concept_rules WHERE id = ?').run(id);
}

/**
 * Resuelve el concepto de un movimiento: primero por código CT y después por
 * las reglas de texto. Si nada encaja, el movimiento se queda sin clasificar
 * (no se inventa nada).
 */
export function resolveConcept(
  ctCode: string | null,
  description: string,
): number | null {
  const db = getDb();

  if (ctCode) {
    const byCode = plainRow<{ id: number }>(
      db.prepare('SELECT id FROM concepts WHERE ct_code = ?').get(ctCode),
    );
    if (byCode) return byCode.id;
  }

  const rules = plainRows<{ id: number; pattern: string }>(
    db.prepare('SELECT id, pattern FROM concept_rules ORDER BY priority, id').all(),
  );

  const haystack = description.toLowerCase();
  for (const rule of rules) {
    const pattern = rule.pattern.toLowerCase();
    if (pattern.length > 0 && haystack.includes(pattern)) return rule.id;
  }

  return null;
}
