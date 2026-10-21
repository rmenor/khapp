'use client';

import {
  Bar,
  BarChart,
  CartesianGrid,
  Cell,
  Line,
  LineChart,
  Pie,
  PieChart,
  XAxis,
  YAxis,
} from 'recharts';
import {
  ChartContainer,
  ChartLegend,
  ChartLegendContent,
  ChartTooltip,
  ChartTooltipContent,
  type ChartConfig,
} from '@/components/ui/chart';

const chartConfig = {
  income: { label: 'Ingresos', color: 'hsl(var(--chart-1))' },
  expenses: { label: 'Gastos', color: 'hsl(var(--chart-3))' },
  balance: { label: 'Saldo', color: 'hsl(var(--chart-2))' },
  value: { label: 'Importe', color: 'hsl(var(--chart-1))' },
} satisfies ChartConfig;

const PALETTE = [
  'hsl(var(--chart-1))',
  'hsl(var(--chart-2))',
  'hsl(var(--chart-3))',
  'hsl(var(--chart-4))',
  'hsl(var(--chart-5))',
];

function formatAxis(value: number): string {
  return `€${Number(value).toLocaleString('es-ES', { maximumFractionDigits: 0 })}`;
}

export interface MonthlyTotalsData {
  month: string;
  income: number;
  expenses: number;
  balance: number;
}

/** Barras: ingresos y gastos de cada mes. */
export function MonthlyTotalsChart({ data }: { data: MonthlyTotalsData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
        <YAxis tickFormatter={formatAxis} width={70} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

/** Línea: evolución del saldo de cierre. */
export function BalanceEvolutionChart({ data }: { data: MonthlyTotalsData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <LineChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis dataKey="month" tickLine={false} tickMargin={10} axisLine={false} />
        <YAxis tickFormatter={formatAxis} width={70} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Line
          dataKey="balance"
          type="monotone"
          stroke="var(--color-balance)"
          strokeWidth={2}
          dot={{ r: 3 }}
        />
      </LineChart>
    </ChartContainer>
  );
}

export interface ShareData {
  name: string;
  value: number;
}

/**
 * Tarta: reparto por concepto. Solo se usa para mostrar un reparto
 * porcentual, nunca para series de tiempo.
 */
export function SharePieChart({ data }: { data: ShareData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <PieChart>
        <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
        <Pie
          data={data}
          dataKey="value"
          nameKey="name"
          innerRadius={60}
          outerRadius={95}
          paddingAngle={3}
        >
          {data.map((entry, index) => (
            <Cell
              key={entry.name}
              fill={PALETTE[index % PALETTE.length]}
            />
          ))}
        </Pie>
        <ChartLegend content={<ChartLegendContent />} />
      </PieChart>
    </ChartContainer>
  );
}

/** Barras horizontales: reparto por concepto (alternativa más legible). */
export function ShareBarChart({ data }: { data: ShareData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[260px] w-full">
      <BarChart accessibilityLayer data={data} layout="vertical">
        <CartesianGrid horizontal={false} />
        <XAxis type="number" tickFormatter={formatAxis} />
        <YAxis type="category" dataKey="name" width={150} tickLine={false} axisLine={false} />
        <ChartTooltip content={<ChartTooltipContent />} />
        <Bar dataKey="value" fill="var(--color-value)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}
