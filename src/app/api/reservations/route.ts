import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { getSession } from '@/lib/auth';

export async function GET(request: Request) {
    const { searchParams } = new URL(request.url);
    const date = searchParams.get('date');

    if (!date) {
        return NextResponse.json({ error: 'Date is required' }, { status: 400 });
    }

    try {
        const reservations = db.prepare('SELECT * FROM reservations WHERE reservation_date = ?').all(date);
        return NextResponse.json(reservations);
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
        const { auditorium_id, date, time_slot, title } = await request.json();

        // Check if slot is already taken by a manual reservation
        const existing = db.prepare('SELECT * FROM reservations WHERE auditorium_id = ? AND reservation_date = ? AND time_slot = ?').get(auditorium_id, date, time_slot);

        if (existing) {
            return NextResponse.json({ error: 'Slot already reserved' }, { status: 409 });
        }

        // Check if slot is taken by a fixed congregation schedule
        const dayOfWeek = new Date(date).getDay(); // 0-6
        const fixed = db.prepare(`
            SELECT * FROM congregations 
            WHERE auditorium_id = ? 
            AND day_of_week = ? 
            AND (time_slot_1 = ? OR time_slot_2 = ?)
        `).get(auditorium_id, dayOfWeek, time_slot, time_slot);

        if (fixed) {
            return NextResponse.json({ error: `Slot reserved for congregation: ${(fixed as any).name}` }, { status: 409 });
        }

        const result = db.prepare('INSERT INTO reservations (auditorium_id, reservation_date, time_slot, title) VALUES (?, ?, ?, ?)').run(auditorium_id, date, time_slot, title);

        return NextResponse.json({ id: result.lastInsertRowid, auditorium_id, date, time_slot, title });
    } catch (error) {
        console.error(error);
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
