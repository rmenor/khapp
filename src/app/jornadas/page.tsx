'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';

interface Jornada {
    id: number;
    name: string;
    date: string;
    description: string;
}

export default function PublicJornadasPage() {
    const [jornadas, setJornadas] = useState<Jornada[]>([]);
    const [loading, setLoading] = useState(true);
    const [selectedJornada, setSelectedJornada] = useState<Jornada | null>(null);

    useEffect(() => {
        fetch('/api/jornadas')
            .then(res => res.json())
            .then(data => {
                setJornadas(data);
                setLoading(false);
            });
    }, []);

    useEffect(() => {
        document.title = 'Próximas Jornadas';
    }, []);

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '4rem 1rem', maxWidth: '900px' }}>
                <h1 className="title" style={{ marginBottom: '2rem', textAlign: 'center' }}>Próximas Jornadas</h1>

                {loading ? (
                    <div style={{ textAlign: 'center' }}>Cargando jornadas...</div>
                ) : jornadas.length === 0 ? (
                    <div style={{ textAlign: 'center' }}>No hay jornadas programadas.</div>
                ) : (
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
                        {jornadas.map((jornada) => (
                            <div key={jornada.id} className="card" style={{ width: '100%' }}>
                                <div style={{
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    marginBottom: '1rem',
                                    gap: '1rem',
                                    flexWrap: 'wrap'
                                }}>
                                    <h2 style={{ fontSize: '1.75rem', fontWeight: 'bold', margin: 0 }}>{jornada.name}</h2>
                                    <div style={{
                                        backgroundColor: 'var(--primary)',
                                        color: 'white',
                                        padding: '0.5rem 1rem',
                                        borderRadius: '0.25rem',
                                        fontSize: '0.875rem',
                                        fontWeight: 'bold',
                                        whiteSpace: 'nowrap'
                                    }}>
                                        {new Date(jornada.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                                    </div>
                                </div>
                                <p style={{
                                    color: '#94a3b8',
                                    lineHeight: '1.6',
                                    marginBottom: '1.5rem',
                                    maxHeight: '4.8em',
                                    overflow: 'hidden',
                                    textOverflow: 'ellipsis',
                                    display: '-webkit-box',
                                    WebkitLineClamp: 3,
                                    WebkitBoxOrient: 'vertical'
                                }}>
                                    {jornada.description}
                                </p>
                                <button
                                    onClick={() => setSelectedJornada(jornada)}
                                    className="btn btn-primary"
                                    style={{ width: 'auto' }}
                                >
                                    Ver contenido completo
                                </button>
                            </div>
                        ))}
                    </div>
                )}

                {/* Modal */}
                {selectedJornada && (
                    <div style={{
                        position: 'fixed',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.7)',
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        zIndex: 1000,
                        padding: '1rem'
                    }} onClick={() => setSelectedJornada(null)}>
                        <div
                            className="card"
                            style={{
                                maxWidth: '700px',
                                width: '100%',
                                maxHeight: '90vh',
                                overflowY: 'auto'
                            }}
                            onClick={(e) => e.stopPropagation()}
                        >
                            <div style={{
                                backgroundColor: 'var(--primary)',
                                color: 'white',
                                padding: '0.5rem 1rem',
                                borderRadius: '0.25rem',
                                display: 'inline-block',
                                marginBottom: '1.5rem',
                                fontSize: '0.875rem',
                                fontWeight: 'bold'
                            }}>
                                {new Date(selectedJornada.date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                            </div>
                            <h2 style={{ fontSize: '2rem', fontWeight: 'bold', marginBottom: '1.5rem' }}>
                                {selectedJornada.name}
                            </h2>
                            <p style={{
                                color: '#94a3b8',
                                lineHeight: '1.8',
                                fontSize: '1.05rem',
                                marginBottom: '2rem',
                                whiteSpace: 'pre-wrap'
                            }}>
                                {selectedJornada.description}
                            </p>
                            <button
                                onClick={() => setSelectedJornada(null)}
                                className="btn btn-secondary"
                                style={{ width: '100%' }}
                            >
                                Cerrar
                            </button>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
