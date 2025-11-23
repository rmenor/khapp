
'use client';

import Link from 'next/link';
import { useRouter } from 'next/navigation';
import * as React from 'react';
import { useEffect, useState } from 'react';
import { Sidebar } from '@/components/sidebar';
import { Skeleton } from '@/components/ui/skeleton';
import { Button } from '@/components/ui/button';
import { Sheet, SheetContent, SheetTrigger } from '@/components/ui/sheet';
import { Home, Landmark, ClipboardList, Settings, LogOut, PanelLeft } from 'lucide-react';
import { AppLogo } from '@/components/icons';
import { cn } from '@/lib/utils';
import { usePathname } from 'next/navigation';


const navLinks = [
    { href: '/dashboard', icon: Home, label: 'Inicio' },
    { href: '/finance', icon: Landmark, label: 'Finanzas' },
    { href: '/requests', icon: ClipboardList, label: 'Solicitudes' },
];

export default function AppLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const router = useRouter();
    const pathname = usePathname();
    const [isClient, setIsClient] = useState(false);
    const [isAuthenticated, setIsAuthenticated] = useState(false);

    useEffect(() => {
        setIsClient(true);
        const authStatus = localStorage.getItem('isAuthenticated') === 'true';
        setIsAuthenticated(authStatus);
        if (!authStatus) {
            router.replace('/login');
        }
    }, [router]);

    const handleLogout = () => {
        localStorage.removeItem('isAuthenticated');
        router.push('/login');
    };
    
    if (!isClient || !isAuthenticated) {
        return (
            <div className="flex flex-col min-h-screen">
                <header className="sticky top-0 flex h-16 items-center gap-4 border-b bg-background/80 backdrop-blur-sm px-4 md:px-6 z-10">
                    <Skeleton className="h-8 w-8 rounded-full" />
                    <Skeleton className="h-6 w-32" />
                    <div className="ml-auto flex items-center gap-4">
                        <Skeleton className="h-10 w-24" />
                    </div>
                </header>
                <main className="flex flex-1 flex-col items-center justify-center gap-4 p-4 md:gap-8 md:p-8">
                    <div className="text-center">
                        <p className="text-lg text-muted-foreground">Verificando autenticación y redirigiendo...</p>
                    </div>
                </main>
            </div>
        );
    }

    return (
        <div className="flex min-h-screen w-full flex-col bg-muted/40">
            <Sidebar />
            <div className="flex flex-col sm:gap-4 sm:py-4 sm:pl-14 print:pl-0 print:py-0">
                 <header className="sticky top-0 z-30 flex h-14 items-center gap-4 border-b bg-background px-4 sm:static sm:h-auto sm:border-0 sm:bg-transparent sm:px-6 print:hidden">
                    <Sheet>
                        <SheetTrigger asChild>
                            <Button size="icon" variant="outline" className="sm:hidden">
                                <PanelLeft className="h-5 w-5" />
                                <span className="sr-only">Toggle Menu</span>
                            </Button>
                        </SheetTrigger>
                        <SheetContent side="left" className="sm:max-w-xs">
                            <nav className="grid gap-6 text-lg font-medium">
                                <Link
                                href="/dashboard"
                                className="group flex h-10 w-10 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:text-base"
                                >
                                <AppLogo className="h-5 w-5 transition-all group-hover:scale-110" />
                                <span className="sr-only">KH App</span>
                                </Link>
                                {navLinks.map(link => (
                                     <Link
                                        key={link.href}
                                        href={link.href}
                                        className={cn(
                                            "flex items-center gap-4 px-2.5",
                                            pathname.startsWith(link.href) ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                        )}
                                    >
                                        <link.icon className="h-5 w-5" />
                                        {link.label}
                                    </Link>
                                ))}
                                <Link
                                    href="/settings"
                                    className={cn(
                                        "flex items-center gap-4 px-2.5",
                                        pathname.startsWith('/settings') ? "text-foreground" : "text-muted-foreground hover:text-foreground"
                                    )}
                                >
                                    <Settings className="h-5 w-5" />
                                    Configuración
                                </Link>
                                <button
                                    onClick={handleLogout}
                                    className="flex items-center gap-4 px-2.5 text-muted-foreground hover:text-foreground"
                                >
                                    <LogOut className="h-5 w-5" />
                                    Cerrar Sesión
                                </button>
                            </nav>
                        </SheetContent>
                    </Sheet>
                 </header>
                <main className="flex-1 items-start gap-4 p-4 sm:px-6 sm:py-0 md:gap-8 print:p-0">
                    {children}
                </main>
            </div>
        </div>
    );
}
