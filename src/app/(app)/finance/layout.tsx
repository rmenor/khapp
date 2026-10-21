import { AccountingUnavailable } from '@/components/finance/accounting-unavailable';
import { FinanceNav } from '@/components/finance/finance-nav';
import { getStorageStatus } from '@/lib/db/client';

export const dynamic = 'force-dynamic';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  // En entornos con el disco de solo lectura (Firebase App Hosting / Cloud Run)
  // no se puede crear la base de datos local. Se comprueba aquí, antes de
  // renderizar las páginas, para explicar la situación en lugar de fallar.
  const status = getStorageStatus();

  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />
      {status.available ? children : <AccountingUnavailable status={status} />}
    </div>
  );
}
