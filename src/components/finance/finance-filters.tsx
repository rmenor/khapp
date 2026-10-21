'use client';

import { useCallback } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { X } from 'lucide-react';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';
import { Label } from '@/components/ui/label';

const MONTHS = [
  { value: 1, label: 'Enero' },
  { value: 2, label: 'Febrero' },
  { value: 3, label: 'Marzo' },
  { value: 4, label: 'Abril' },
  { value: 5, label: 'Mayo' },
  { value: 6, label: 'Junio' },
  { value: 7, label: 'Julio' },
  { value: 8, label: 'Agosto' },
  { value: 9, label: 'Septiembre' },
  { value: 10, label: 'Octubre' },
  { value: 11, label: 'Noviembre' },
  { value: 12, label: 'Diciembre' },
];

const QUARTERS = [
  { value: 1, label: '1.er trimestre' },
  { value: 2, label: '2.º trimestre' },
  { value: 3, label: '3.er trimestre' },
  { value: 4, label: '4.º trimestre' },
];

const ALL = '__all__';

/**
 * Filtros combinables de la vista de movimientos.
 *
 * Todos los filtros viven en la URL: la vista se puede compartir tal cual y
 * los totales se recalculan con el filtro aplicado.
 */
export function FinanceFilters({
  years,
  concepts,
  ctCodes,
}: {
  years: number[];
  concepts: { id: number; name: string }[];
  ctCodes: string[];
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = useCallback(
    (key: string, value: string | null) => {
      const params = new URLSearchParams(Array.from(searchParams.entries()));
      if (value === null || value === '' || value === ALL) {
        params.delete(key);
      } else {
        params.set(key, value);
      }
      const query = params.toString();
      router.push(query ? `${pathname}?${query}` : pathname);
    },
    [pathname, router, searchParams],
  );

  const hasFilters = Array.from(searchParams.keys()).length > 0;

  return (
    <div className="flex flex-col gap-4 rounded-lg border p-4">
      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-anio">Año</Label>
          <Select
            value={searchParams.get('year') ?? ALL}
            onValueChange={(value) => setParam('year', value)}
          >
            <SelectTrigger id="filtro-anio">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los años</SelectItem>
              {years.map((year) => (
                <SelectItem key={year} value={String(year)}>
                  {year}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-mes">Mes</Label>
          <Select
            value={searchParams.get('mes') ?? ALL}
            onValueChange={(value) => setParam('mes', value)}
          >
            <SelectTrigger id="filtro-mes">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los meses</SelectItem>
              {MONTHS.map((month) => (
                <SelectItem key={month.value} value={String(month.value)}>
                  {month.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-trimestre">Trimestre</Label>
          <Select
            value={searchParams.get('trimestre') ?? ALL}
            onValueChange={(value) => setParam('trimestre', value)}
          >
            <SelectTrigger id="filtro-trimestre">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los trimestres</SelectItem>
              {QUARTERS.map((quarter) => (
                <SelectItem key={quarter.value} value={String(quarter.value)}>
                  {quarter.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-concepto">Concepto</Label>
          <Select
            value={searchParams.get('concepto') ?? ALL}
            onValueChange={(value) => setParam('concepto', value)}
          >
            <SelectTrigger id="filtro-concepto">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos los conceptos</SelectItem>
              {concepts.map((concept) => (
                <SelectItem key={concept.id} value={String(concept.id)}>
                  {concept.name}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-ct">Código CT</Label>
          <Select
            value={searchParams.get('ct') ?? ALL}
            onValueChange={(value) => setParam('ct', value)}
          >
            <SelectTrigger id="filtro-ct">
              <SelectValue placeholder="Todos" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todos</SelectItem>
              {ctCodes.map((code) => (
                <SelectItem key={code} value={code}>
                  {code}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-cuenta">Cuenta</Label>
          <Select
            value={searchParams.get('cuenta') ?? ALL}
            onValueChange={(value) => setParam('cuenta', value)}
          >
            <SelectTrigger id="filtro-cuenta">
              <SelectValue placeholder="Todas" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value={ALL}>Todas las cuentas</SelectItem>
              <SelectItem value="caja">Caja</SelectItem>
              <SelectItem value="banco">Banco</SelectItem>
            </SelectContent>
          </Select>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-min">Importe mínimo</Label>
          <Input
            id="filtro-min"
            type="number"
            step="0.01"
            defaultValue={searchParams.get('min') ?? ''}
            onBlur={(event) => setParam('min', event.target.value)}
            placeholder="0,00"
          />
        </div>

        <div className="flex flex-col gap-1.5">
          <Label htmlFor="filtro-max">Importe máximo</Label>
          <Input
            id="filtro-max"
            type="number"
            step="0.01"
            defaultValue={searchParams.get('max') ?? ''}
            onBlur={(event) => setParam('max', event.target.value)}
            placeholder="Sin límite"
          />
        </div>
      </div>

      <div className="flex flex-col gap-1.5">
        <Label htmlFor="filtro-texto">Texto libre</Label>
        <Input
          id="filtro-texto"
          defaultValue={searchParams.get('q') ?? ''}
          onBlur={(event) => setParam('q', event.target.value)}
          placeholder="Buscar en la descripción"
        />
      </div>

      {hasFilters && (
        <div>
          <Button
            variant="ghost"
            size="sm"
            onClick={() => router.push(pathname)}
            className="text-muted-foreground"
          >
            <X className="mr-2 h-4 w-4" />
            Quitar todos los filtros
          </Button>
        </div>
      )}
    </div>
  );
}
