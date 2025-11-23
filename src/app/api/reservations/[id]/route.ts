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
        const { title } = await request.json();

        const result = db.prepare('UPDATE reservations SET title = ? WHERE id = ?').run(title, id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        return NextResponse.json({ id: Number(id), title });
    } catch (error) {
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
        const result = db.prepare('DELETE FROM reservations WHERE id = ?').run(id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Reservation not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Reservation deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
