'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';

export default function Navbar() {
    const pathname = usePathname();
    const [isDark, setIsDark] = useState(false);
    const [cartCount, setCartCount] = useState(0);

    useEffect(() => {
        // Check for saved theme preference or default to light
        const savedTheme = localStorage.getItem('theme');
        const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
        const shouldBeDark = savedTheme === 'dark' || (!savedTheme && prefersDark);

        setIsDark(shouldBeDark);
        document.documentElement.classList.toggle('dark', shouldBeDark);
    }, []);

    useEffect(() => {
        // Update cart count from localStorage
        const updateCartCount = () => {
            const cart = JSON.parse(localStorage.getItem('cart') || '[]');
            setCartCount(cart.reduce((sum: number, item: any) => sum + item.quantity, 0));
        };

        updateCartCount();
        window.addEventListener('storage', updateCartCount);
        window.addEventListener('cartUpdated', updateCartCount);

        return () => {
            window.removeEventListener('storage', updateCartCount);
            window.removeEventListener('cartUpdated', updateCartCount);
        };
    }, []);

    const toggleTheme = () => {
        const newTheme = !isDark;
        setIsDark(newTheme);
        document.documentElement.classList.toggle('dark', newTheme);
        localStorage.setItem('theme', newTheme ? 'dark' : 'light');
    };

    return (
        <nav style={{
            background: 'var(--navbar-bg)',
            borderBottom: '1px solid var(--border)',
            padding: '1rem 0',
            position: 'sticky',
            top: 0,
            zIndex: 100,
            backdropFilter: 'blur(10px)',
            boxShadow: '0 1px 3px var(--shadow)'
        }}>
            <div className="container" style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center'
            }}>
                <Link href="/" style={{
                    fontSize: '1.5rem',
                    fontWeight: 'bold',
                    background: 'linear-gradient(135deg, var(--primary), var(--accent))',
                    backgroundClip: 'text',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '0.5rem'
                }}>
                    🏢
                </Link>

                <div style={{ display: 'flex', gap: '1.5rem', alignItems: 'center' }}>
                    <Link href="/jornadas" style={{
                        color: 'var(--foreground)',
                        fontWeight: '500',
                        transition: 'color 0.2s'
                    }}>
                        Jornadas
                    </Link>
                    <Link href="/reservations" style={{
                        color: 'var(--foreground)',
                        fontWeight: '500',
                        transition: 'color 0.2s'
                    }}>
                        Reservas
                    </Link>
                    <Link href="/cart" style={{
                        position: 'relative',
                        color: 'var(--foreground)',
                        fontWeight: '500',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '0.25rem'
                    }}>
                        🛒 Carrito
                        {cartCount > 0 && (
                            <span style={{
                                position: 'absolute',
                                top: '-8px',
                                right: '-8px',
                                background: 'var(--primary)',
                                color: 'white',
                                borderRadius: '50%',
                                width: '20px',
                                height: '20px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                fontSize: '0.75rem',
                                fontWeight: 'bold'
                            }}>
                                {cartCount}
                            </span>
                        )}
                    </Link>

                    <button
                        onClick={toggleTheme}
                        style={{
                            background: 'var(--secondary)',
                            border: '1px solid var(--border)',
                            borderRadius: '0.5rem',
                            padding: '0.5rem 1rem',
                            cursor: 'pointer',
                            display: 'flex',
                            alignItems: 'center',
                            gap: '0.5rem',
                            fontSize: '1rem',
                            color: 'var(--foreground)',
                            transition: 'all 0.2s',
                            fontWeight: '500'
                        }}
                        onMouseEnter={(e) => {
                            e.currentTarget.style.transform = 'translateY(-1px)';
                            e.currentTarget.style.boxShadow = '0 4px 8px var(--shadow)';
                        }}
                        onMouseLeave={(e) => {
                            e.currentTarget.style.transform = 'translateY(0)';
                            e.currentTarget.style.boxShadow = 'none';
                        }}
                    >
                        {isDark ? '☀️' : '🌙'}
                    </button>

                    <Link href="/dashboard" className="btn btn-primary" style={{
                        padding: '0.5rem 1rem',
                        fontSize: '0.9rem'
                    }}>
                        Panel
                    </Link>
                </div>
            </div>
        </nav>
    );
}
