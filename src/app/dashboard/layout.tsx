'use client';

import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { useEffect, useState } from 'react';

export default function DashboardLayout({
    children,
}: {
    children: React.ReactNode;
}) {
    const pathname = usePathname();
    const router = useRouter();
    const [user, setUser] = useState<{ name: string; email: string } | null>(null);

    useEffect(() => {
        fetch('/api/auth/me')
            .then((res) => res.json())
            .then((data) => {
                if (!data.user) {
                    router.push('/login');
                } else {
                    setUser(data.user);
                }
            });
    }, [router]);

    const handleLogout = async () => {
        await fetch('/api/auth/logout', { method: 'POST' });
        router.push('/');
        router.refresh();
    };

    return (
        <div className="dashboard-layout" style={{ display: 'flex', minHeight: '100vh' }}>
            {/* Sidebar */}
            <aside style={{
                width: '250px',
                backgroundColor: '#1e293b',
                borderRight: '1px solid var(--border)',
                display: 'flex',
                flexDirection: 'column',
                position: 'fixed',
                height: '100vh',
                left: 0,
                top: 0
            }}>
                <div style={{ padding: '1.5rem', borderBottom: '1px solid var(--border)' }}>
                    <h2 style={{ fontSize: '1.25rem', fontWeight: 'bold', color: 'white' }}>Dashboard</h2>
                </div>

                <nav style={{ padding: '1rem', flex: 1 }}>
                    <ul style={{ listStyle: 'none', display: 'flex', flexDirection: 'column', gap: '0.5rem' }}>
                        <li>
                            <Link href="/dashboard" style={{
                                display: 'block',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: pathname === '/dashboard' ? 'var(--primary)' : 'transparent',
                                color: pathname === '/dashboard' ? 'white' : '#94a3b8',
                                transition: 'all 0.2s'
                            }}>
                                Overview
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/auditoriums" style={{
                                display: 'block',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: pathname.startsWith('/dashboard/auditoriums') ? 'var(--primary)' : 'transparent',
                                color: pathname.startsWith('/dashboard/auditoriums') ? 'white' : '#94a3b8',
                                transition: 'all 0.2s'
                            }}>
                                Auditoriums
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/congregations" style={{
                                display: 'block',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: pathname.startsWith('/dashboard/congregations') ? 'var(--primary)' : 'transparent',
                                color: pathname.startsWith('/dashboard/congregations') ? 'white' : '#94a3b8',
                                transition: 'all 0.2s'
                            }}>
                                Congregations
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/jornadas" style={{
                                display: 'block',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: pathname.startsWith('/dashboard/jornadas') ? 'var(--primary)' : 'transparent',
                                color: pathname.startsWith('/dashboard/jornadas') ? 'white' : '#94a3b8',
                                transition: 'all 0.2s'
                            }}>
                                Jornadas
                            </Link>
                        </li>
                        <li>
                            <Link href="/dashboard/settings" style={{
                                display: 'block',
                                padding: '0.75rem 1rem',
                                borderRadius: '0.5rem',
                                backgroundColor: pathname === '/dashboard/settings' ? 'var(--primary)' : 'transparent',
                                color: pathname === '/dashboard/settings' ? 'white' : '#94a3b8',
                                transition: 'all 0.2s'
                            }}>
                                Settings
                            </Link>
                        </li>
                    </ul>
                </nav>

                <div style={{ padding: '1rem', borderTop: '1px solid var(--border)' }}>
                    <div style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                        <div style={{ width: '32px', height: '32px', borderRadius: '50%', backgroundColor: 'var(--accent)', display: 'flex', alignItems: 'center', justifyContent: 'center', fontWeight: 'bold' }}>
                            {user?.name?.[0] || 'U'}
                        </div>
                        <div style={{ overflow: 'hidden' }}>
                            <p style={{ fontSize: '0.875rem', fontWeight: 'bold', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.name}</p>
                            <p style={{ fontSize: '0.75rem', color: '#94a3b8', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{user?.email}</p>
                        </div>
                    </div>
                    <button onClick={handleLogout} className="btn btn-secondary" style={{ width: '100%', fontSize: '0.875rem' }}>
                        Logout
                    </button>
                </div>
            </aside>

            {/* Main Content Area */}
            <div style={{ flex: 1, marginLeft: '250px', display: 'flex', flexDirection: 'column' }}>
                {/* Topbar */}
                <header style={{
                    height: '64px',
                    borderBottom: '1px solid var(--border)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 2rem',
                    backgroundColor: 'rgba(15, 23, 42, 0.8)',
                    backdropFilter: 'blur(10px)',
                    position: 'sticky',
                    top: 0,
                    zIndex: 10
                }}>
                    <h1 style={{ fontSize: '1.25rem', fontWeight: '600' }}>
                        {pathname === '/dashboard' ? 'Overview' : 'Settings'}
                    </h1>
                    <div style={{ display: 'flex', gap: '1rem', alignItems: 'center' }}>
                        <span style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{new Date().toLocaleDateString()}</span>
                    </div>
                </header>

                {/* Page Content */}
                <div style={{ padding: '2rem' }}>
                    {children}
                </div>
            </div>
        </div>
    );
}
