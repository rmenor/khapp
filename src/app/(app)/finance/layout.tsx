import { FinanceNav } from '@/components/finance/finance-nav';

export default function FinanceLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-4">
      <FinanceNav />
      {children}
    </div>
  );
}
