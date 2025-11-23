'use client';

import { useEffect, useState } from 'react';

interface Auditorium {
    id: number;
    name: string;
    color: string;
}

export default function AuditoriumsPage() {
    const [auditoriums, setAuditoriums] = useState<Auditorium[]>([]);
    const [loading, setLoading] = useState(true);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [color, setColor] = useState('#3b82f6');

    useEffect(() => {
        fetchAuditoriums();
    }, []);

    const fetchAuditoriums = () => {
        fetch('/api/auditoriums')
            .then(res => res.json())
            .then(data => {
                setAuditoriums(data);
                setLoading(false);
            });
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const res = await fetch('/api/auditoriums', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, color }),
        });

        if (res.ok) {
            const newAudit = await res.json();
            setAuditoriums([...auditoriums, newAudit]);
            setName('');
            setColor('#3b82f6');
            setShowForm(false);
        } else {
            alert('Failed to create auditorium');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Auditoriums Management</h2>
                <button onClick={() => setShowForm(!showForm)} className="btn btn-primary">
                    {showForm ? 'Cancel' : '+ Add Auditorium'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>Add New Auditorium</h3>
                    <form onSubmit={handleSubmit} style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name *</label>
                            <input
                                type="text"
                                value={name}
                                onChange={(e) => setName(e.target.value)}
                                className="input"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Color</label>
                            <input
                                type="color"
                                value={color}
                                onChange={(e) => setColor(e.target.value)}
                                className="input"
                                style={{ width: '100%', height: '40px' }}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            <button type="button" onClick={() => setShowForm(false)} className="btn btn-secondary">Cancel</button>
                            <button type="submit" className="btn btn-primary">Create</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Name</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Color</th>
                        </tr>
                    </thead>
                    <tbody>
                        {auditoriums.map((audit) => (
                            <tr key={audit.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{audit.name}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                                        <div style={{ width: '24px', height: '24px', backgroundColor: audit.color, borderRadius: '4px', border: '1px solid var(--border)' }}></div>
                                        <span>{audit.color}</span>
                                    </div>
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>
        </div>
    );
}
