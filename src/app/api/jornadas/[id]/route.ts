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
        const { name, date, description } = await request.json();

        const result = db.prepare(
            'UPDATE jornadas SET name = ?, date = ?, description = ? WHERE id = ?'
        ).run(name, date, description, id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Jornada not found' }, { status: 404 });
        }

        return NextResponse.json({ id, name, date, description });
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
        const result = db.prepare('DELETE FROM jornadas WHERE id = ?').run(id);

        if (result.changes === 0) {
            return NextResponse.json({ error: 'Jornada not found' }, { status: 404 });
        }

        return NextResponse.json({ message: 'Jornada deleted' });
    } catch (error) {
        return NextResponse.json({ error: 'Internal Server Error' }, { status: 500 });
    }
}
