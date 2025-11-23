
'use client';

import { Suspense } from 'react';
import { useSearchParams } from 'next/navigation';
import HomePageContent from '@/components/home-page-content';

function FinancePage() {
    const searchParams = useSearchParams();
    const monthParam = searchParams.get('month');
    const yearParam = searchParams.get('year');
    
    return (
        <HomePageContent monthParam={monthParam} yearParam={yearParam} />
    );
}

export default function Finance() {
    return (
        <Suspense fallback={<div className="flex h-screen w-full items-center justify-center">Cargando...</div>}>
            <FinancePage />
        </Suspense>
    );
}
