
import { getCongregationAction } from '@/lib/actions';

export default async function DashboardPage() {
  const { name: congregationName } = await getCongregationAction();
  return (
    <div className="flex flex-1 items-center justify-center rounded-lg border border-dashed shadow-sm h-[calc(100vh-8rem)]">
      <div className="flex flex-col items-center gap-2 text-center">
        <h1 className="text-3xl font-bold tracking-tight">
          Bienvenido a KH App
        </h1>
        <p className="text-lg text-muted-foreground">
          {congregationName ? `Congregación ${congregationName}` : 'Tu panel para gestionar la congregación.'}
        </p>
      </div>
    </div>
  );
}
