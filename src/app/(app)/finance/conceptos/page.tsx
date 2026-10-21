import { ConceptsManager } from '@/components/finance/concepts-manager';
import { listConcepts, listRules } from '@/lib/db/queries/concepts';

export const dynamic = 'force-dynamic';

export default function ConceptosPage() {
  const concepts = listConcepts();
  const rules = listRules();

  return (
    <div className="flex flex-col gap-4">
      <div>
        <h1 className="text-2xl font-bold tracking-tight">Conceptos</h1>
        <p className="text-sm text-muted-foreground">
          Catálogo de conceptos y reglas de asignación de los movimientos.
        </p>
      </div>

      <ConceptsManager
        concepts={concepts.map((concept) => ({
          id: concept.id,
          name: concept.name,
          kind: concept.kind,
          category: concept.category,
          ctCode: concept.ct_code,
        }))}
        rules={rules.map((rule) => ({
          id: rule.id,
          pattern: rule.pattern,
          concept_id: rule.concept_id,
          priority: rule.priority,
          concept_name: rule.concept_name,
        }))}
      />
    </div>
  );
}
