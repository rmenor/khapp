'use client';

import { useEffect, useState } from 'react';
import Navbar from '@/components/Navbar';
import { useRouter } from 'next/navigation';

interface Auditorium {
    id: number;
    name: string;
    color: string;
}

interface Reservation {
    id: number;
    auditorium_id: number;
    reservation_date: string;
    time_slot: number;
    title: string;
}

interface Congregation {
    id: number;
    name: string;
    auditorium_id: number | null;
    day_of_week: number | null;
    time_slot_1: number | null;
    time_slot_2: number | null;
    day_of_week_2: number | null;
    time_slot_3: number | null;
    time_slot_4: number | null;
}

export default function ReservationsPage() {
    const router = useRouter();
    const [auditoriums, setAuditoriums] = useState<Auditorium[]>([]);
    const [reservations, setReservations] = useState<Reservation[]>([]);
    const [congregations, setCongregations] = useState<Congregation[]>([]);
    const [date, setDate] = useState(new Date().toISOString().split('T')[0]);
    const [loading, setLoading] = useState(true);

    // Modal State
    const [showModal, setShowModal] = useState(false);
    const [selectedSlot, setSelectedSlot] = useState<{ auditId: number; auditName: string; slot: number } | null>(null);
    const [congregation, setCongregation] = useState('');

    const hours = Array.from({ length: 13 }, (_, i) => i + 10); // 10 to 22

    useEffect(() => {
        Promise.all([
            fetch('/api/auditoriums').then(res => res.json()),
            fetch('/api/congregations').then(res => res.json())
        ]).then(([auditsData, congsData]) => {
            setAuditoriums(auditsData);
            setCongregations(congsData);
        });
    }, []);

    useEffect(() => {
        // Fetch reservations when date changes
        setLoading(true);
        fetch(`/api/reservations?date=${date}`)
            .then(res => res.json())
            .then(data => {
                setReservations(data);
                setLoading(false);
            });
    }, [date]);

    useEffect(() => {
        document.title = 'Reservas de Auditorios';
    }, []);

    const [editingReservation, setEditingReservation] = useState<Reservation | null>(null);

    const getFixedReservation = (auditId: number, slot: number) => {
        const day = new Date(date).getDay(); // 0-6
        return congregations.find(c =>
            c.auditorium_id === auditId && (
                (c.day_of_week === day && (c.time_slot_1 === slot || c.time_slot_2 === slot)) ||
                (c.day_of_week_2 === day && (c.time_slot_3 === slot || c.time_slot_4 === slot))
            )
        );
    };

    const handleCellClick = (audit: Auditorium, slot: number) => {
        const fixed = getFixedReservation(audit.id, slot);
        if (fixed) {
            alert('This slot is permanently reserved for ' + fixed.name);
            return;
        }

        const existing = reservations.find(r => r.auditorium_id === audit.id && r.time_slot === slot);
        if (existing) {
            setEditingReservation(existing);
            setSelectedSlot({ auditId: audit.id, auditName: audit.name, slot });
            setCongregation(existing.title);
            setShowModal(true);
        } else {
            setEditingReservation(null);
            setSelectedSlot({ auditId: audit.id, auditName: audit.name, slot });
            setCongregation('');
            setShowModal(true);
        }
    };

    const handleReserve = async () => {
        if (!selectedSlot || !congregation) return;

        if (editingReservation) {
            const res = await fetch(`/api/reservations/${editingReservation.id}`, {
                method: 'PUT',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ title: congregation })
            });

            if (res.ok) {
                const updated = await res.json();
                setReservations(reservations.map(r => r.id === updated.id ? { ...r, title: updated.title } : r));
                setShowModal(false);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to update reservation');
            }
        } else {
            const res = await fetch('/api/reservations', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    auditorium_id: selectedSlot.auditId,
                    date,
                    time_slot: selectedSlot.slot,
                    title: congregation
                }),
            });

            if (res.ok) {
                const newRes = await res.json();
                setReservations([...reservations, newRes]);
                setShowModal(false);
            } else {
                const err = await res.json();
                alert(err.error || 'Failed to create reservation');
            }
        }
    };

    const handleDelete = async (id: number) => {
        const res = await fetch(`/api/reservations/${id}`, { method: 'DELETE' });
        if (res.ok) {
            setReservations(reservations.filter(r => r.id !== id));
            setShowModal(false);
        } else {
            alert('Failed to delete reservation');
        }
    };

    const changeDate = (days: number) => {
        const d = new Date(date);
        d.setDate(d.getDate() + days);
        setDate(d.toISOString().split('T')[0]);
    };

    return (
        <>
            <Navbar />
            <main className="container" style={{ padding: '2rem 1rem' }}>
                <h1 className="title" style={{ marginBottom: '1rem' }}>Reserva de auditorios</h1>

                <div className="card" style={{ marginBottom: '2rem', backgroundColor: '#f8fafc', color: '#334155' }}>
                    <p>Para reservar un horario pulsa sobre la hora libre, se abrirá un modal, introduce el nombre de la congregación.</p>
                    <p>Si quieres cancelar una reserva, pulsa sobre el horario ocupado y confirma la cancelación.</p>
                </div>

                <div style={{ display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '1rem', marginBottom: '2rem' }}>
                    <button onClick={() => changeDate(-1)} className="btn btn-secondary">←</button>
                    <input
                        type="date"
                        value={date}
                        onChange={(e) => setDate(e.target.value)}
                        style={{ padding: '0.5rem', borderRadius: '0.25rem', border: '1px solid var(--border)' }}
                    />
                    <button onClick={() => changeDate(1)} className="btn btn-secondary">→</button>
                    <span style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>
                        {new Date(date).toLocaleDateString('es-ES', { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}
                    </span>
                </div>

                <div style={{ overflowX: 'auto' }}>
                    <table style={{ width: '100%', borderCollapse: 'collapse', minWidth: '1000px' }}>
                        <thead>
                            <tr>
                                <th style={{ padding: '1rem', width: '150px' }}></th>
                                {hours.map(h => (
                                    <th key={h} style={{ padding: '0.5rem', backgroundColor: '#e2e8f0', color: '#1e293b', border: '1px solid #cbd5e1' }}>
                                        {h}:00
                                    </th>
                                ))}
                            </tr>
                        </thead>
                        <tbody>
                            {auditoriums.map(audit => (
                                <tr key={audit.id}>
                                    <td style={{
                                        padding: '1rem',
                                        backgroundColor: audit.color,
                                        color: 'white',
                                        fontWeight: 'bold',
                                        textAlign: 'center',
                                        border: '1px solid white'
                                    }}>
                                        {audit.name}
                                    </td>
                                    {hours.map(h => {
                                        const fixed = getFixedReservation(audit.id, h);
                                        const res = reservations.find(r => r.auditorium_id === audit.id && r.time_slot === h);

                                        const isFixed = !!fixed;
                                        const isReserved = !!res;
                                        const isOccupied = isFixed || isReserved;

                                        return (
                                            <td
                                                key={h}
                                                onClick={() => handleCellClick(audit, h)}
                                                style={{
                                                    padding: '0.5rem',
                                                    border: '1px solid #cbd5e1',
                                                    textAlign: 'center',
                                                    cursor: isFixed ? 'not-allowed' : 'pointer',
                                                    backgroundColor: isFixed ? '#fecaca' : (isReserved ? '#fca5a5' : '#f1f5f9'), // Darker red for fixed
                                                    color: isOccupied ? '#7f1d1d' : '#64748b',
                                                    height: '60px',
                                                    verticalAlign: 'middle'
                                                }}
                                            >
                                                {isFixed ? (
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{fixed.name}</div>
                                                ) : isReserved ? (
                                                    <div style={{ fontSize: '0.875rem', fontWeight: 'bold' }}>{res.title}</div>
                                                ) : (
                                                    <span style={{ fontSize: '0.875rem' }}>Libre</span>
                                                )}
                                            </td>
                                        );
                                    })}
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>

                {/* Modal */}
                {showModal && selectedSlot && (
                    <div style={{
                        position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
                        backgroundColor: 'rgba(0,0,0,0.5)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 50
                    }}>
                        <div style={{ backgroundColor: 'white', padding: '2rem', borderRadius: '0.5rem', width: '400px', maxWidth: '90%', color: 'black' }}>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 'bold', marginBottom: '1rem' }}>Reserva de horario</h3>
                            <p style={{ marginBottom: '1rem', color: '#475569' }}>
                                Reservar en <strong>{selectedSlot.auditName}</strong> a las <strong>{selectedSlot.slot}:00</strong> del {date}.
                            </p>
                            <input
                                type="text"
                                placeholder="Congregación"
                                value={congregation}
                                onChange={(e) => setCongregation(e.target.value)}
                                className="input"
                                style={{ width: '100%', marginBottom: '1.5rem', border: '1px solid #cbd5e1', backgroundColor: 'white', color: '#1e293b' }}
                                autoFocus
                            />
                            <div style={{ display: 'flex', gap: '1rem', justifyContent: 'flex-end', marginTop: '1rem' }}>
                                {editingReservation && (
                                    <button
                                        onClick={() => {
                                            if (confirm('Are you sure you want to delete this reservation?')) {
                                                handleDelete(editingReservation.id);
                                            }
                                        }}
                                        className="btn"
                                        style={{ backgroundColor: '#ef4444', color: 'white', border: 'none' }}
                                    >
                                        Delete
                                    </button>
                                )}
                                <button onClick={() => setShowModal(false)} className="btn btn-secondary">Cancel</button>
                                <button onClick={handleReserve} className="btn btn-primary">
                                    {editingReservation ? 'Update' : 'Save'}
                                </button>
                            </div>
                        </div>
                    </div>
                )}
            </main>
        </>
    );
}
