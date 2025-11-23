
'use client';

import { Bar, BarChart, CartesianGrid, XAxis, YAxis, ResponsiveContainer, Pie, PieChart, Cell } from 'recharts';
import {
  ChartContainer,
  ChartTooltip,
  ChartTooltipContent,
  ChartLegend,
  ChartLegendContent,
} from '@/components/ui/chart';
import { es } from 'date-fns/locale';

interface MonthlyData {
  month: string;
  income: number;
  expenses: number;
  branch_transfer: number;
}

interface IncomeByCategory {
    [key: string]: number;
}

const chartConfig = {
  income: {
    label: 'Ingresos',
    color: 'hsl(var(--chart-1))',
  },
  expenses: {
    label: 'Gastos',
    color: 'hsl(var(--chart-3))',
  },
  branch_transfer: {
    label: 'Enviado Sucursal',
    color: 'hsl(var(--chart-2))',
  },
  congregation: {
    label: 'Congregación',
    color: 'hsl(var(--chart-1))',
  },
  worldwide_work: {
    label: 'Obra Mundial',
    color: 'hsl(var(--chart-2))',
  },
  renovation: {
    label: 'Renovación',
    color: 'hsl(var(--chart-4))',
  },
};

export function MonthlyOverviewChart({ data }: { data: MonthlyData[] }) {
  return (
    <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
      <BarChart accessibilityLayer data={data}>
        <CartesianGrid vertical={false} />
        <XAxis
          dataKey="month"
          tickLine={false}
          tickMargin={10}
          axisLine={false}
          tickFormatter={(value) => {
            const date = new Date(value);
            return date.toLocaleString('es-ES', { month: 'short' }).replace('.', '');
           }}
        />
        <YAxis
            tickFormatter={(value) => `€${value/1000}k`}
        />
        <ChartTooltip content={<ChartTooltipContent />} />
        <ChartLegend content={<ChartLegendContent />} />
        <Bar dataKey="income" fill="var(--color-income)" radius={4} />
        <Bar dataKey="expenses" fill="var(--color-expenses)" radius={4} />
        <Bar dataKey="branch_transfer" fill="var(--color-branch_transfer)" radius={4} />
      </BarChart>
    </ChartContainer>
  );
}

export function IncomeBreakdownChart({ data }: { data: IncomeByCategory }) {
    const chartData = Object.entries(data).map(([key, value]) => ({
        name: chartConfig[key as keyof typeof chartConfig]?.label || key,
        value,
        fill: `var(--color-${key.replace('_', '-')})`,
    }));
    
    return (
        <ChartContainer config={chartConfig} className="min-h-[200px] w-full">
            <PieChart>
                <ChartTooltip content={<ChartTooltipContent nameKey="name" />} />
                <Pie data={chartData} dataKey="value" nameKey="name" innerRadius={60} outerRadius={80} paddingAngle={5}>
                    {chartData.map((entry) => (
                        <Cell key={`cell-${entry.name}`} fill={entry.fill} />
                    ))}
                </Pie>
                 <ChartLegend content={<ChartLegendContent />} />
            </PieChart>
        </ChartContainer>
    );
}
