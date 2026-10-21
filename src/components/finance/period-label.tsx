import { monthName, quarterOf } from '@/lib/finance/normalize/month';

export interface PeriodDescriptor {
  year?: number;
  months?: number[];
  quarter?: number;
}

/**
 * Describe el periodo activo de forma legible: "septiembre de 2026",
 * "2026 · 3.er trimestre" o "todos los meses".
 */
export function describePeriod(period: PeriodDescriptor): string {
  const { year, months, quarter } = period;

  if (quarter) {
    return `${year ?? ''} · ${quarter}.er trimestre`.trim();
  }

  if (months && months.length > 0) {
    if (months.length === 1) {
      return year ? `${monthName(months[0])} de ${year}` : monthName(months[0]);
    }
    return `${months.length} meses${year ? ` de ${year}` : ''}`;
  }

  if (year) return String(year);

  return 'Todos los meses';
}

/**
 * Etiqueta del periodo activo, visible siempre en la pantalla.
 */
export function PeriodLabel({ period }: { period: PeriodDescriptor }) {
  return (
    <span className="text-sm text-muted-foreground">
      Periodo activo: <span className="font-medium text-foreground">{describePeriod(period)}</span>
    </span>
  );
}

export { quarterOf };
