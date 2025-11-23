import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET() {
    try {
        const congregations = db.prepare('SELECT * FROM congregations ORDER BY name ASC').all();
        return NextResponse.json(congregations);
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

export async function POST(request: Request) {
    const session = await getSession();
    if (!session) {
        return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    try {
        const { name, address, contact_person, contact_phone, auditorium_id, day_of_week, time_slot_1, time_slot_2, day_of_week_2, time_slot_3, time_slot_4 } = await request.json();

        if (!name) {
            return NextResponse.json({ error: 'Name is required' }, { status: 400 });
        }

        // Helper to check conflicts
        const checkConflict = (day: number | null, t1: number | null, t2: number | null) => {
            if (!auditorium_id || day === null || (!t1 && !t2)) return null;

            return db.prepare(`
                SELECT * FROM congregations 
                WHERE auditorium_id = ? 
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
                auditorium_id,
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
            'INSERT INTO congregations (name, address, contact_person, contact_phone, auditorium_id, day_of_week, time_slot_1, time_slot_2, day_of_week_2, time_slot_3, time_slot_4) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)'
        ).run(name, address || '', contact_person || '', contact_phone || '', auditorium_id || null, day_of_week ?? null, time_slot_1 || null, time_slot_2 || null, day_of_week_2 ?? null, time_slot_3 || null, time_slot_4 || null);

        return NextResponse.json({
            id: result.lastInsertRowid,
            name,
            address,
            contact_person,
            contact_phone,
            auditorium_id,
            day_of_week,
            time_slot_1,
            time_slot_2,
            day_of_week_2,
            time_slot_3,
            time_slot_4
        });
    } catch (error) {
        console.error('Error creating congregation:', error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}

