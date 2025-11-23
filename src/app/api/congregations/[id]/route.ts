import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function PUT(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const { name, address, contact_person, contact_phone, auditorium_id, day_of_week, time_slot_1, time_slot_2, day_of_week_2, time_slot_3, time_slot_4 } = await request.json();

        // Helper to check conflicts (excluding self)
        const checkConflict = (day: number | null, t1: number | null, t2: number | null) => {
            if (!auditorium_id || day === null || (!t1 && !t2)) return null;

            return db.prepare(`
                SELECT * FROM congregations 
                WHERE auditorium_id = ? 
                AND id != ?
                AND (
                    (day_of_week = ? AND (
                        (time_slot_1 IS NOT NULL AND (time_slot_1 = ? OR time_slot_1 = ?)) OR
                        (time_slot_2 IS NOT NULL AND (time_slot_2 = ? OR time_slot_2 = ?))
                    )) OR
                    (day_of_week_2 = ? AND (
                        (time_slot_3 IS NOT NULL AND (time_slot_3 = ? OR time_slot_3 = ?)) OR
                        (time_slot_4 IS NOT NULL AND (time_slot_4 = ? OR time_slot_4 = ?))
                    ))
                )
            `).get(
                auditorium_id, id,
                day ?? -1, t1, t2, t1, t2,
                day ?? -1, t1, t2, t1, t2
            );
        };

        // Validate Meeting 1
        const conflict1 = checkConflict(day_of_week, time_slot_1, time_slot_2);
        if (conflict1) {
            return NextResponse.json({ error: `Schedule conflict (Meeting 1) with: ${(conflict1 as any).name}` }, { status: 409 });
        }

        // Validate Meeting 2
        const conflict2 = checkConflict(day_of_week_2, time_slot_3, time_slot_4);
        if (conflict2) {
            return NextResponse.json({ error: `Schedule conflict (Meeting 2) with: ${(conflict2 as any).name}` }, { status: 409 });
        }

        const result = db.prepare(
            'UPDATE congregations SET name = ?, address = ?, contact_person = ?, contact_phone = ?, auditorium_id = ?, day_of_week = ?, time_slot_1 = ?, time_slot_2 = ?, day_of_week_2 = ?, time_slot_3 = ?, time_slot_4 = ? WHERE id = ?'
        ).run(name, address, contact_person, contact_phone, auditorium_id, day_of_week ?? null, time_slot_1 || null, time_slot_2 || null, day_of_week_2 ?? null, time_slot_3 || null, time_slot_4 || null, id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
        }

        return NextResponse.json({ id, name, address, contact_person, contact_phone, auditorium_id, day_of_week, time_slot_1, time_slot_2, day_of_week_2, time_slot_3, time_slot_4 });
    } catch (error) {
        console.error('Error updating congregation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function DELETE(request: Request, { params }: { params: Promise<{ id: string }> }) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { id } = await params;
        const result = db.prepare('DELETE FROM congregations WHERE id = ?').run(id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Congregation not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Congregation deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
