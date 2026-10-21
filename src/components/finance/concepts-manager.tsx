'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Loader2, Plus, RefreshCw, Trash2 } from 'lucide-react';
import { Badge } from '@/components/ui/badge';
import { Button } from '@/components/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from '@/components/ui/table';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import {
  deleteConceptAction,
  deleteRuleAction,
  reapplyConceptsAction,
  saveConceptAction,
  saveRuleAction,
} from '@/lib/finance/actions';

export interface ConceptRow {
  id: number;
  name: string;
  kind: 'income' | 'expense' | 'transfer';
  category: string | null;
  ctCode: string | null;
}
export interface RuleRow {
  id: number;
  pattern: string;
  concept_id: number;
  priority: number;
  concept_name: string;
}

const KIND_LABELS: Record<ConceptRow['kind'], string> = {
  income: 'Ingreso',
  expense: 'Gasto',
  transfer: 'Traspaso',
};

const CATEGORY_LABELS: Record<string, string> = {
  congregation: 'Congregación',
  worldwide_work: 'Obra mundial',
  renovation: 'Renovación',
  branch: 'Sucursal',
  other: 'Otros',
};

export function ConceptsManager({
  concepts,
  rules,
}: {
  concepts: ConceptRow[];
  rules: RuleRow[];
}) {
  const { toast } = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);

  const [editingConcept, setEditingConcept] = useState<ConceptRow | null>(null);
  const [conceptName, setConceptName] = useState('');
  const [conceptKind, setConceptKind] = useState<ConceptRow['kind']>('income');
  const [conceptCategory, setConceptCategory] = useState('other');
  const [conceptCtCode, setConceptCtCode] = useState('');

  const [rulePattern, setRulePattern] = useState('');
  const [ruleConceptId, setRuleConceptId] = useState('');

  const run = async (action: () => Promise<{ success: boolean; message: string }>) => {
    setBusy(true);
    try {
      const result = await action();
      toast({
        title: result.success ? 'Éxito' : 'Error',
        description: result.message,
        variant: result.success ? 'default' : 'destructive',
      });
      if (result.success) router.refresh();
    } finally {
      setBusy(false);
    }
  };

  const startEditing = (concept: ConceptRow) => {
    setEditingConcept(concept);
    setConceptName(concept.name);
    setConceptKind(concept.kind);
    setConceptCategory(concept.category ?? 'other');
    setConceptCtCode(concept.ctCode ?? '');
  };

  const resetForm = () => {
    setEditingConcept(null);
    setConceptName('');
    setConceptKind('income');
    setConceptCategory('other');
    setConceptCtCode('');
  };

  return (
    <div className="flex flex-col gap-4">
      <Card>
        <CardHeader>
          <CardTitle>Conceptos</CardTitle>
          <CardDescription>
            Los conceptos clasifican los movimientos. El tipo decide si cuentan como ingreso, como
            gasto o como traspaso entre cuentas (que mueve fondos pero no es ni ingreso ni gasto).
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Nombre</TableHead>
                <TableHead>Tipo</TableHead>
                <TableHead>Categoría</TableHead>
                <TableHead>Código CT</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {concepts.map((concept) => (
                <TableRow key={concept.id}>
                  <TableCell className="font-medium">{concept.name}</TableCell>
                  <TableCell>
                    <Badge variant="outline">{KIND_LABELS[concept.kind]}</Badge>
                  </TableCell>
                  <TableCell>{CATEGORY_LABELS[concept.category ?? 'other'] ?? concept.category}</TableCell>
                  <TableCell>{concept.ctCode ?? '—'}</TableCell>
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-1">
                      <Button
                        variant="ghost"
                        size="sm"
                        onClick={() => startEditing(concept)}
                        disabled={busy}
                      >
                        Editar
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => void run(() => deleteConceptAction(concept.id))}
                        disabled={busy}
                      >
                        <Trash2 className="h-4 w-4 text-red-500" />
                        <span className="sr-only">Eliminar</span>
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))}
              {concepts.length === 0 && (
                <TableRow>
                  <TableCell colSpan={5} className="py-10 text-center text-muted-foreground">
                    No hay conceptos definidos.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-2 lg:grid-cols-4">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concepto-nombre">Nombre</Label>
              <Input
                id="concepto-nombre"
                value={conceptName}
                onChange={(event) => setConceptName(event.target.value)}
                placeholder="Donaciones para la congregación"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concepto-tipo">Tipo</Label>
              <Select value={conceptKind} onValueChange={(value) => setConceptKind(value as ConceptRow['kind'])}>
                <SelectTrigger id="concepto-tipo">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="income">Ingreso</SelectItem>
                  <SelectItem value="expense">Gasto</SelectItem>
                  <SelectItem value="transfer">Traspaso</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concepto-categoria">Categoría</Label>
              <Select value={conceptCategory} onValueChange={setConceptCategory}>
                <SelectTrigger id="concepto-categoria">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="congregation">Congregación</SelectItem>
                  <SelectItem value="worldwide_work">Obra mundial</SelectItem>
                  <SelectItem value="renovation">Renovación</SelectItem>
                  <SelectItem value="branch">Sucursal</SelectItem>
                  <SelectItem value="other">Otros</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="concepto-ct">Código CT</Label>
              <Input
                id="concepto-ct"
                value={conceptCtCode}
                onChange={(event) => setConceptCtCode(event.target.value)}
                placeholder="C, G, D, OM, T"
              />
            </div>
            <div className="sm:col-span-2 lg:col-span-4">
              <Button
                onClick={() =>
                  void run(async () => {
                    const result = await saveConceptAction({
                      id: editingConcept?.id,
                      name: conceptName,
                      kind: conceptKind,
                      category: conceptCategory,
                      ctCode: conceptCtCode || null,
                    });
                    if (result.success) resetForm();
                    return result;
                  })
                }
                disabled={busy || conceptName.trim().length === 0}
              >
                {busy && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                <Plus className="mr-2 h-4 w-4" />
                {editingConcept ? 'Guardar cambios' : 'Añadir concepto'}
              </Button>
              {editingConcept && (
                <Button variant="ghost" className="ml-2" onClick={resetForm} disabled={busy}>
                  Cancelar
                </Button>
              )}
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle>Reglas de asignación</CardTitle>
          <CardDescription>
            Si el texto de la descripción contiene el patrón, el movimiento se asigna a ese
            concepto. Se aplican por orden de prioridad.
          </CardDescription>
        </CardHeader>
        <CardContent className="flex flex-col gap-4">
          <Table>
            <TableHeader>
              <TableRow>
                <TableHead>Texto que contiene</TableHead>
                <TableHead>Concepto</TableHead>
                <TableHead className="text-right">Prioridad</TableHead>
                <TableHead className="text-right">Acciones</TableHead>
              </TableRow>
            </TableHeader>
            <TableBody>
              {rules.map((rule) => (
                <TableRow key={rule.id}>
                  <TableCell className="font-medium">{rule.pattern}</TableCell>
                  <TableCell>{rule.concept_name}</TableCell>
                  <TableCell className="text-right">{rule.priority}</TableCell>
                  <TableCell className="text-right">
                    <Button
                      variant="ghost"
                      size="icon"
                      onClick={() => void run(() => deleteRuleAction(rule.id))}
                      disabled={busy}
                    >
                      <Trash2 className="h-4 w-4 text-red-500" />
                      <span className="sr-only">Eliminar</span>
                    </Button>
                  </TableCell>
                </TableRow>
              ))}
              {rules.length === 0 && (
                <TableRow>
                  <TableCell colSpan={4} className="py-10 text-center text-muted-foreground">
                    No hay reglas definidas.
                  </TableCell>
                </TableRow>
              )}
            </TableBody>
          </Table>

          <div className="grid gap-3 rounded-lg border p-4 sm:grid-cols-3">
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regla-patron">Texto que contiene</Label>
              <Input
                id="regla-patron"
                value={rulePattern}
                onChange={(event) => setRulePattern(event.target.value)}
                placeholder="Obra mundial"
              />
            </div>
            <div className="flex flex-col gap-1.5">
              <Label htmlFor="regla-concepto">Concepto</Label>
              <Select value={ruleConceptId} onValueChange={setRuleConceptId}>
                <SelectTrigger id="regla-concepto">
                  <SelectValue placeholder="Selecciona un concepto" />
                </SelectTrigger>
                <SelectContent>
                  {concepts.map((concept) => (
                    <SelectItem key={concept.id} value={String(concept.id)}>
                      {concept.name}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="flex items-end gap-2">
              <Button
                onClick={() =>
                  void run(async () => {
                    const result = await saveRuleAction({
                      pattern: rulePattern,
                      conceptId: Number(ruleConceptId),
                      priority: 0,
                    });
                    if (result.success) {
                      setRulePattern('');
                      setRuleConceptId('');
                    }
                    return result;
                  })
                }
                disabled={busy || !rulePattern.trim() || !ruleConceptId}
              >
                <Plus className="mr-2 h-4 w-4" />
                Añadir regla
              </Button>
            </div>
          </div>

          <div>
            <Button
              variant="secondary"
              onClick={() => void run(() => reapplyConceptsAction())}
              disabled={busy}
            >
              {busy ? (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              ) : (
                <RefreshCw className="mr-2 h-4 w-4" />
              )}
              Reaplicar conceptos a todos los movimientos
            </Button>
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
