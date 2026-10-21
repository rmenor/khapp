'use client';

import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from '@/components/ui/select';

const MONTH_NAMES = [
  'Enero', 'Febrero', 'Marzo', 'Abril', 'Mayo', 'Junio',
  'Julio', 'Agosto', 'Septiembre', 'Octubre', 'Noviembre', 'Diciembre',
];

/**
 * Selector de mes del panel. El mes elegido viaja en la URL, de modo que la
 * vista se puede compartir.
 */
export function MonthSelector({
  months,
  selectedYear,
  selectedMonth,
}: {
  months: { year: number; month: number }[];
  selectedYear?: number;
  selectedMonth?: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();

  const setParam = (key: string, value: string) => {
    const params = new URLSearchParams(Array.from(searchParams.entries()));
    params.set(key, value);
    router.push(`${pathname}?${params.toString()}`);
  };

  const years = [...new Set(months.map((month) => month.year))].sort((a, b) => b - a);

  return (
    <div className="flex gap-2">
      <Select
        value={selectedYear ? String(selectedYear) : undefined}
        onValueChange={(value) => setParam('year', value)}
      >
        <SelectTrigger className="w-[120px]" aria-label="Año">
          <SelectValue placeholder="Año" />
        </SelectTrigger>
        <SelectContent>
          {years.map((year) => (
            <SelectItem key={year} value={String(year)}>
              {year}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>

      <Select
        value={selectedMonth ? String(selectedMonth) : undefined}
        onValueChange={(value) => setParam('month', value)}
      >
        <SelectTrigger className="w-[150px]" aria-label="Mes">
          <SelectValue placeholder="Mes" />
        </SelectTrigger>
        <SelectContent>
          {MONTH_NAMES.map((name, index) => (
            <SelectItem key={index + 1} value={String(index + 1)}>
              {name}
            </SelectItem>
          ))}
        </SelectContent>
      </Select>
    </div>
  );
}
