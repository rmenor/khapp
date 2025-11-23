'use client';

import { useEffect, useState } from 'react';

interface Congregation {
    id: number;
    name: string;
    address: string;
    contact_person: string;
    contact_phone: string;
    auditorium_id?: number | null;
    day_of_week?: number | null;
    time_slot_1?: number | null;
    time_slot_2?: number | null;
    day_of_week_2?: number | null;
    time_slot_3?: number | null;
    time_slot_4?: number | null;
}

interface Auditorium {
    id: number;
    name: string;
}

const dayNames = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];

export default function CongregationsPage() {
    const [congregations, setCongregations] = useState<Congregation[]>([]);
    const [auditoriums, setAuditoriums] = useState<Auditorium[]>([]);
    const [loading, setLoading] = useState(true);
    const [isEditing, setIsEditing] = useState<Congregation | null>(null);
    const [showForm, setShowForm] = useState(false);

    // Form State
    const [name, setName] = useState('');
    const [address, setAddress] = useState('');
    const [contactPerson, setContactPerson] = useState('');
    const [contactPhone, setContactPhone] = useState('');
    const [auditoriumId, setAuditoriumId] = useState<number | ''>('');
    const [dayOfWeek, setDayOfWeek] = useState<number | ''>('');
    const [timeSlot1, setTimeSlot1] = useState<number | ''>('');
    const [timeSlot2, setTimeSlot2] = useState<number | ''>('');
    const [dayOfWeek2, setDayOfWeek2] = useState<number | ''>('');
    const [timeSlot3, setTimeSlot3] = useState<number | ''>('');
    const [timeSlot4, setTimeSlot4] = useState<number | ''>('');

    useEffect(() => {
        Promise.all([
            fetch('/api/congregations').then(res => res.json()),
            fetch('/api/auditoriums').then(res => res.json())
        ]).then(([congsData, auditsData]) => {
            setCongregations(congsData);
            setAuditoriums(auditsData);
            setLoading(false);
        });
    }, []);

    const resetForm = () => {
        setName('');
        setAddress('');
        setContactPerson('');
        setContactPhone('');
        setAuditoriumId('');
        setDayOfWeek('');
        setTimeSlot1('');
        setTimeSlot2('');
        setDayOfWeek2('');
        setTimeSlot3('');
        setTimeSlot4('');
        setIsEditing(null);
        setShowForm(false);
    };

    const handleEdit = (cong: Congregation) => {
        setIsEditing(cong);
        setName(cong.name);
        setAddress(cong.address);
        setContactPerson(cong.contact_person);
        setContactPhone(cong.contact_phone);
        setAuditoriumId(cong.auditorium_id || '');
        setDayOfWeek(cong.day_of_week !== null && cong.day_of_week !== undefined ? cong.day_of_week : '');
        setTimeSlot1(cong.time_slot_1 || '');
        setTimeSlot2(cong.time_slot_2 || '');
        setDayOfWeek2(cong.day_of_week_2 !== null && cong.day_of_week_2 !== undefined ? cong.day_of_week_2 : '');
        setTimeSlot3(cong.time_slot_3 || '');
        setTimeSlot4(cong.time_slot_4 || '');
        setShowForm(true);
    };

    const handleSubmit = async (e: React.FormEvent) => {
        e.preventDefault();

        const url = isEditing ? `/api/congregations/${isEditing.id}` : '/api/congregations';
        const method = isEditing ? 'PUT' : 'POST';

        const res = await fetch(url, {
            method,
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                name,
                address,
                contact_person: contactPerson,
                contact_phone: contactPhone,
                auditorium_id: auditoriumId || null,
                day_of_week: dayOfWeek !== '' ? dayOfWeek : null,
                time_slot_1: timeSlot1 || null,
                time_slot_2: timeSlot2 || null,
                day_of_week_2: dayOfWeek2 !== '' ? dayOfWeek2 : null,
                time_slot_3: timeSlot3 || null,
                time_slot_4: timeSlot4 || null
            }),
        });

        if (res.ok) {
            const savedCong = await res.json();
            if (isEditing) {
                setCongregations(congregations.map(c => c.id === savedCong.id ? savedCong : c));
            } else {
                setCongregations([...congregations, savedCong]);
            }
            resetForm();
        } else {
            const err = await res.json();
            alert(err.error || 'Failed to save congregation');
        }
    };

    const handleDelete = async (id: number) => {
        if (!confirm('Are you sure you want to delete this congregation?')) return;

        const res = await fetch(`/api/congregations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setCongregations(congregations.filter(c => c.id !== id));
        } else {
            alert('Failed to delete congregation');
        }
    };

    if (loading) return <div>Loading...</div>;

    return (
        <div>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
                <h2 style={{ fontSize: '1.5rem', fontWeight: 'bold' }}>Congregations Management</h2>
                <button onClick={() => { resetForm(); setShowForm(!showForm); }} className="btn btn-primary">
                    {showForm ? 'Cancel' : '+ Add Congregation'}
                </button>
            </div>

            {showForm && (
                <div className="card" style={{ marginBottom: '2rem' }}>
                    <h3 style={{ fontSize: '1.25rem', marginBottom: '1rem' }}>{isEditing ? 'Edit Congregation' : 'Add New Congregation'}</h3>
                    <form onSubmit={handleSubmit}>
                        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Name *</label>
                                <input type="text" value={name} onChange={(e) => setName(e.target.value)} className="input" required style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Address</label>
                                <input type="text" value={address} onChange={(e) => setAddress(e.target.value)} className="input" style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contact Person</label>
                                <input type="text" value={contactPerson} onChange={(e) => setContactPerson(e.target.value)} className="input" style={{ width: '100%' }} />
                            </div>
                            <div>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Contact Phone</label>
                                <input type="text" value={contactPhone} onChange={(e) => setContactPhone(e.target.value)} className="input" style={{ width: '100%' }} />
                            </div>
                        </div>

                        <div style={{ borderTop: '1px solid var(--border)', paddingTop: '1rem', marginTop: '1rem' }}>
                            <h4 style={{ fontSize: '1rem', fontWeight: 'bold', marginBottom: '1rem' }}>Fixed Schedule</h4>
                            <div style={{ marginBottom: '1rem' }}>
                                <label style={{ display: 'block', marginBottom: '0.5rem' }}>Auditorium</label>
                                <select value={auditoriumId} onChange={(e) => setAuditoriumId(Number(e.target.value) || '')} className="input" style={{ width: '100%' }}>
                                    <option value="">Select Auditorium</option>
                                    {auditoriums.map(audit => (<option key={audit.id} value={audit.id}>{audit.name}</option>))}
                                </select>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1', fontWeight: 'bold' }}>Meeting 1</div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Day</label>
                                    <select value={dayOfWeek} onChange={(e) => setDayOfWeek(e.target.value === '' ? '' : Number(e.target.value))} className="input" style={{ width: '100%' }}>
                                        <option value="">Select Day</option>
                                        {dayNames.map((day, i) => (<option key={i} value={i}>{day}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Slot 1</label>
                                    <input type="number" min="10" max="22" value={timeSlot1} onChange={(e) => setTimeSlot1(Number(e.target.value) || '')} className="input" placeholder="19" style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Slot 2</label>
                                    <input type="number" min="10" max="22" value={timeSlot2} onChange={(e) => setTimeSlot2(Number(e.target.value) || '')} className="input" placeholder="20" style={{ width: '100%' }} />
                                </div>
                            </div>
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '1rem' }}>
                                <div style={{ gridColumn: '1 / -1', fontWeight: 'bold' }}>Meeting 2</div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Day</label>
                                    <select value={dayOfWeek2} onChange={(e) => setDayOfWeek2(e.target.value === '' ? '' : Number(e.target.value))} className="input" style={{ width: '100%' }}>
                                        <option value="">Select Day</option>
                                        {dayNames.map((day, i) => (<option key={i} value={i}>{day}</option>))}
                                    </select>
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Slot 1</label>
                                    <input type="number" min="10" max="22" value={timeSlot3} onChange={(e) => setTimeSlot3(Number(e.target.value) || '')} className="input" placeholder="10" style={{ width: '100%' }} />
                                </div>
                                <div>
                                    <label style={{ display: 'block', marginBottom: '0.5rem' }}>Slot 2</label>
                                    <input type="number" min="10" max="22" value={timeSlot4} onChange={(e) => setTimeSlot4(Number(e.target.value) || '')} className="input" placeholder="11" style={{ width: '100%' }} />
                                </div>
                            </div>
                        </div>

                        <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1.5rem' }}>
                            {isEditing && (<button type="button" onClick={resetForm} className="btn btn-secondary">Cancel</button>)}
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
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Contact</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Schedule</th>
                            <th style={{ padding: '1rem', borderBottom: '1px solid var(--border)' }}>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {congregations.map((cong) => (
                            <tr key={cong.id} style={{ borderBottom: '1px solid var(--border)' }}>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ fontWeight: 'bold' }}>{cong.name}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{cong.address}</div>
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div>{cong.contact_person}</div>
                                    <div style={{ fontSize: '0.875rem', color: '#94a3b8' }}>{cong.contact_phone}</div>
                                </td>
                                <td style={{ padding: '1rem', fontSize: '0.875rem' }}>
                                    {cong.day_of_week !== null && cong.day_of_week !== undefined && (
                                        <div>{dayNames[cong.day_of_week]}: {cong.time_slot_1}:00, {cong.time_slot_2}:00</div>
                                    )}
                                    {cong.day_of_week_2 !== null && cong.day_of_week_2 !== undefined && (
                                        <div>{dayNames[cong.day_of_week_2]}: {cong.time_slot_3}:00, {cong.time_slot_4}:00</div>
                                    )}
                                    {!cong.day_of_week && !cong.day_of_week_2 && <span style={{ color: '#94a3b8' }}>No schedule</span>}
                                </td>
                                <td style={{ padding: '1rem' }}>
                                    <div style={{ display: 'flex', gap: '0.5rem' }}>
                                        <button onClick={() => handleEdit(cong)} className="btn btn-secondary" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem' }}>Edit</button>
                                        <button onClick={() => handleDelete(cong.id)} className="btn" style={{ padding: '0.25rem 0.75rem', fontSize: '0.875rem', backgroundColor: '#ef4444', color: 'white', border: 'none' }}>Delete</button>
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
