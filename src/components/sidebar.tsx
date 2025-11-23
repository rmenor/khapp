
'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { Home, Landmark, ClipboardList, Settings, LogOut } from 'lucide-react';

import { cn } from '@/lib/utils';
import { Button, buttonVariants } from '@/components/ui/button';
import { AppLogo } from './icons';
import { TooltipProvider, Tooltip, TooltipTrigger, TooltipContent } from './ui/tooltip';

const navLinks = [
  {
    href: '/dashboard',
    icon: Home,
    label: 'Inicio',
  },
  {
    href: '/finance',
    icon: Landmark,
    label: 'Finanzas',
  },
  {
    href: '/requests',
    icon: ClipboardList,
    label: 'Solicitudes',
  },
];

export function Sidebar() {
  const pathname = usePathname();
  const router = useRouter();
  
  const handleLogout = () => {
    localStorage.removeItem('isAuthenticated');
    router.push('/login');
  };

  return (
    <aside className="fixed inset-y-0 left-0 z-10 hidden w-14 flex-col border-r bg-background sm:flex print:hidden">
      <nav className="flex flex-col items-center gap-4 px-2 sm:py-4">
        <Link
          href="/dashboard"
          className="group flex h-9 w-9 shrink-0 items-center justify-center gap-2 rounded-full bg-primary text-lg font-semibold text-primary-foreground md:h-8 md:w-8 md:text-base"
        >
          <AppLogo className="h-5 w-5 transition-all group-hover:scale-110" />
          <span className="sr-only">KH App</span>
        </Link>
        <TooltipProvider>
            {navLinks.map((link) => (
            <Tooltip key={link.href}>
                <TooltipTrigger asChild>
                <Link
                    href={link.href}
                    className={cn(
                    buttonVariants({ variant: pathname.startsWith(link.href) ? 'default' : 'ghost', size: 'icon' }),
                    'rounded-lg',
                    !pathname.startsWith(link.href) && 'text-muted-foreground'
                    )}
                >
                    <link.icon className="h-5 w-5" />
                    <span className="sr-only">{link.label}</span>
                </Link>
                </TooltipTrigger>
                <TooltipContent side="right">{link.label}</TooltipContent>
            </Tooltip>
            ))}
        </TooltipProvider>
      </nav>
      <nav className="mt-auto flex flex-col items-center gap-4 px-2 sm:py-4">
        <TooltipProvider>
          <Tooltip>
            <TooltipTrigger asChild>
              <Link
                href="/settings"
                className={cn(
                    buttonVariants({ variant: pathname.startsWith('/settings') ? 'default' : 'ghost', size: 'icon' }),
                     'rounded-lg',
                    !pathname.startsWith('/settings') && 'text-muted-foreground'
                )}
              >
                <Settings className="h-5 w-5" />
                <span className="sr-only">Settings</span>
              </Link>
            </TooltipTrigger>
            <TooltipContent side="right">Settings</TooltipContent>
          </Tooltip>
          <Tooltip>
            <TooltipTrigger asChild>
                <Button variant="ghost" size="icon" className="rounded-lg text-muted-foreground" onClick={handleLogout}>
                    <LogOut className="h-5 w-5" />
                    <span className="sr-only">Cerrar Sesión</span>
                </Button>
            </TooltipTrigger>
            <TooltipContent side="right">Cerrar Sesión</TooltipContent>
          </Tooltip>
        </TooltipProvider>
      </nav>
    </aside>
  );
}
