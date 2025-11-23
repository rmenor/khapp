'use client';

import { useEffect, useState } from 'react';

interface Jornada {
    id: number;
    name: string;
    date: string;
    description: string;
}

export default function JornadasPage() {
    const [jornadas, setJornadas] = useState<Jornada[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<Jornada | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [date, setDate] = useState('');
    const [description, setDescription] = useState('');

    useEffect(() => {
        fetchJornadas();
    }, []);

    const fetchJornadas = () => {
        fetch('/api/jornadas')
            .then(res => res.json())
            .then(data => {
                setJornadas(data);
                setLoading(false);
            });
    };

    const resetForm = () => {
        setName('');
        setDate('');
        setDescription('');
        setIsEditing(null);
        setShowForm(false);
    };

    const handleEdit = (jornada: Jornada) => {
        setIsEditing(jornada);
        setName(jornada.name);
        setDate(jornada.date);
        setDescription(jornada.description);
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const url = isEditing ? `/api/jornadas/${isEditing.id}` : '/api/jornadas';
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ name, date, description }),
        });

        if (res.ok) {
            const savedJornada = await res.json();
            if (isEditing) {
                setJornadas(jornadas.map(j => j.id === savedJornada.id ? savedJornada : j));
            } else {
                setJornadas([...jornadas, savedJornada]);
            }
            resetForm();
        } else {
            alert('Failed to save jornada');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this jornada?')) return;

        const res = await fetch(`/api/jornadas/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setJornadas(jornadas.filter(j => j.id !== id));
        } else {
            alert('Failed to delete jornada');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Jornadas Management</h2>
                <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
                    {showForm ? 'Cancel' : '+ Add Jornada'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{isEditing ? 'Edit Jornada' : 'Add New Jornada'}</h3>
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
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Date *</label>
                            <input
                                type="date"
                                value={date}
                                onChange={(e) => setDate(e.target.value)}
                                className="input"
                                required
                                style={{ width: '100%' }}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1' }}>
                            <label style={{ display: 'block', marginBottom: '0.5rem' }}>Description</label>
                            <textarea
                                value={description}
                                onChange={(e) => setDescription(e.target.value)}
                                className="input"
                                style={{ width: '100%', minHeight: '100px' }}
                            />
                        </div>
                        <div style={{ gridColumn: '1 / -1', display: 'flex', gap: '1rem', justifyContent: 'flex-end' }}>
                            {isEditing && (
                                <button type="button" onClick={resetForm} className="btn btn-secondary">Cancel</button>
                            )}
                            <button type="submit" className="btn btn-primary">{isEditing ? 'Update' : 'Create'}</button>
                        </div>
                    </form>
                </div>
            )}

            <div className="card" style={{ padding: 0, overflow: 'hidden' }}>
                <table style={{ width: '100%', borderCollapse: 'collapse' }}>
                    <thead style={{ backgroundColor: 'rgba(255,255,255,0.05)', textAlign: 'left' }}>
                        <tr>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Name</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Date</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Description</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {jornadas.map((jornada) => (
                            <tr key={jornada.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem', fontWeight: 'bold' }}>{jornada.name}</td>
                                <td style={{ padding: '1rem' }}>{new Date(jornada.date).toLocaleDateString()}</td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>
                                        {jornada.description ? jornada.description.substring(0, 50) + (jornada.description.length > 50 ? '...' : '') : '-'}
                                    </div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleEdit(jornada)} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>
                                            Edit
                                        </button>
                                        <button onClick={() => handleDelete(jornada.id)} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: '#ef4444', color: 'white', border: 'none' }}>
                                            Delete
                                        </button>
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
