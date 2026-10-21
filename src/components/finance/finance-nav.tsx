'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { BarChart3, FileUp, LayoutDashboard, List, Tags } from 'lucide-react';
import { cn } from '@/lib/utils';

const TABS = [
  { href: '/finance', label: 'Resumen', icon: LayoutDashboard, exact: true },
  { href: '/finance/importar', label: 'Importar', icon: FileUp, exact: false },
  { href: '/finance/movimientos', label: 'Movimientos', icon: List, exact: false },
  { href: '/finance/estadisticas', label: 'Estadísticas', icon: BarChart3, exact: false },
  { href: '/finance/conceptos', label: 'Conceptos', icon: Tags, exact: false },
];

export function FinanceNav() {
  const pathname = usePathname();

  return (
    <nav className="flex flex-col gap-1 border-b pb-2 sm:flex-row sm:items-center sm:gap-2 sm:overflow-x-auto print:hidden">
      {TABS.map((tab) => {
        const active = tab.exact
          ? pathname === tab.href
          : pathname.startsWith(tab.href);

        return (
          <Link
            key={tab.href}
            href={tab.href}
            className={cn(
              'flex items-center gap-2 whitespace-nowrap rounded-md px-3 py-1.5 text-sm font-medium transition-colors',
              active
                ? 'bg-primary text-primary-foreground'
                : 'text-muted-foreground hover:bg-accent hover:text-foreground',
            )}
          >
            <tab.icon className="h-4 w-4" />
            {tab.label}
          </Link>
        );
      })}
    </nav>
  );
}
